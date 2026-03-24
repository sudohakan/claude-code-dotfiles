# Common Patterns

## Skeleton Projects
1. Search for battle-tested skeleton projects
2. Evaluate options in parallel (security, extensibility, relevance, implementation)
3. Clone best match as foundation; iterate within proven structure

## Repository Pattern
Encapsulate data access behind a consistent interface: findAll, findById, create, update, delete. Business logic depends on the abstract interface. Concrete implementations handle storage details.

## API Response Format
Consistent envelope: success indicator, data payload (nullable on error), error message (nullable on success), pagination metadata (total, page, limit) when applicable.
