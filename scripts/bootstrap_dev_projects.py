#!/usr/bin/env python3
import argparse
import json
import os
import shutil
import subprocess
import sys
from pathlib import Path


def run(command, cwd=None, allow_fail=False):
    result = subprocess.run(
        command,
        cwd=str(cwd) if cwd else None,
        shell=True,
        text=True,
        capture_output=True,
    )
    if result.returncode != 0 and not allow_fail:
        raise RuntimeError(result.stderr.strip() or result.stdout.strip() or command)
    return result


def print_status(kind, message):
    print(f"  [{kind}] {message}")


def repo_is_dirty(repo_dir: Path) -> bool:
    result = run("git status --porcelain", cwd=repo_dir, allow_fail=True)
    return bool((result.stdout or "").strip())


def ensure_git_repo(project, target_dir: Path):
    repo_url = project.get("repoUrl")
    branch = project.get("branch")
    if not repo_url:
        return "manual"

    if target_dir.exists():
        if not (target_dir / ".git").exists():
            print_status("--", f"{project['name']}: directory exists but is not a git repo, preserving as-is")
            return "existing-non-git"
        if repo_is_dirty(target_dir):
            print_status("--", f"{project['name']}: local changes detected, skipping update")
            return "dirty"
        run("git fetch --all --tags --quiet", cwd=target_dir, allow_fail=True)
        if branch:
            run(f"git checkout {branch}", cwd=target_dir, allow_fail=True)
            run(f"git pull origin {branch} --ff-only", cwd=target_dir, allow_fail=True)
        else:
            run("git pull --ff-only", cwd=target_dir, allow_fail=True)
        print_status("OK", f"{project['name']}: repository ready")
        return "updated"

    target_dir.parent.mkdir(parents=True, exist_ok=True)
    branch_arg = f" --branch {branch}" if branch else ""
    run(f"git clone{branch_arg} {repo_url} \"{target_dir}\"")
    print_status("OK", f"{project['name']}: cloned")
    return "cloned"


def verify_paths(base_dir: Path, verify_paths):
    missing = []
    for relative in verify_paths or []:
        if not (base_dir / relative).exists():
            missing.append(relative)
    return missing


def maybe_copy_env(project_dir: Path, project):
    if not project.get("copyEnvExample"):
        return None
    env_example = project_dir / ".env.example"
    env_file = project_dir / ".env"
    if env_example.exists() and not env_file.exists():
        shutil.copyfile(env_example, env_file)
        return str(env_file)
    return None


def bootstrap_node_project(project, target_dir: Path):
    best_effort = bool(project.get("bestEffortBuild"))
    for command in project.get("installCommands", []):
        try:
            run(command, cwd=target_dir, allow_fail=best_effort)
            print_status("OK", f"{project['name']}: ran `{command}`")
        except RuntimeError as error:
            if best_effort:
                print_status("--", f"{project['name']}: `{command}` failed ({error})")
            else:
                raise


def bootstrap_docker_compose_project(project, target_dir: Path):
    if shutil.which("docker") is None:
        print_status("--", f"{project['name']}: Docker not found, repo prepared but service not validated")
        return
    compose_v2 = run("docker compose version", cwd=target_dir, allow_fail=True)
    if compose_v2.returncode == 0:
        validate = run("docker compose config", cwd=target_dir, allow_fail=True)
    else:
        validate = run("docker-compose config", cwd=target_dir, allow_fail=True)
    if validate.returncode == 0:
        print_status("OK", f"{project['name']}: docker compose config is valid")
    else:
        print_status("--", f"{project['name']}: docker compose config check failed")


def scaffold_manual_project(project, target_dir: Path):
    target_dir.mkdir(parents=True, exist_ok=True)
    for relative in project.get("scaffoldDirectories", []):
        (target_dir / relative).mkdir(parents=True, exist_ok=True)
    print_status("OK", f"{project['name']}: scaffolded local directories")


def main():
    parser = argparse.ArgumentParser(description="Bootstrap local dev projects used by the Claude setup.")
    parser.add_argument("--manifest", required=True, help="Path to external-projects.manifest.json")
    parser.add_argument("--dev-root", required=True, help="Root directory for cloned local projects")
    parser.add_argument("--skip-ids", default="", help="Comma-separated manifest project ids to skip")
    args = parser.parse_args()

    manifest_path = Path(args.manifest)
    dev_root = Path(args.dev_root)
    manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
    skip_ids = {item.strip() for item in args.skip_ids.split(",") if item.strip()}

    print(f"  Using manifest: {manifest_path}")
    print(f"  Dev root: {dev_root}")

    for project in manifest.get("projects", []):
        if project.get("id") in skip_ids:
            print_status("--", f"{project['name']}: skipped by installer option")
            continue
        target_dir = dev_root / project["directoryName"]
        print_status("..", f"{project['name']} -> {target_dir}")

        bootstrap_type = project.get("bootstrapType")
        if bootstrap_type == "manual-scaffold":
            scaffold_manual_project(project, target_dir)
            continue

        state = ensure_git_repo(project, target_dir)
        if state == "existing-non-git":
            continue

        if bootstrap_type == "node":
            bootstrap_node_project(project, target_dir)
            env_created = maybe_copy_env(target_dir, project)
            if env_created:
                print_status("OK", f"{project['name']}: created {env_created}")
        elif bootstrap_type == "docker-compose":
            bootstrap_docker_compose_project(project, target_dir)

        missing = verify_paths(target_dir, project.get("verifyPaths"))
        if missing:
            print_status("--", f"{project['name']}: missing expected paths: {', '.join(missing)}")
        else:
            print_status("OK", f"{project['name']}: verification passed")

    return 0


if __name__ == "__main__":
    sys.exit(main())
