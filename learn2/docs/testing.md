# How to test

!!! abstract "Verify changes"
    **Automated tests** catch regressions; Happy’s contributing guide also asks for **visual proof** (screenshots or recordings) for many PRs — read `docs/CONTRIBUTING.md` before you open a PR.

| Package | Typical command | Notes |
|---------|-----------------|-------|
| happy-cli | `yarn workspace happy test` | After `yarn workspace happy build` when you need a full build. |
| happy-server | `yarn workspace happy-server test` | Uses Vitest (`vitest run` in package scripts). |
| happy-app | `yarn workspace happy-app test` | Vitest per `happy-app/package.json`; also run `typecheck` often. |

**Typechecking** (static analysis, not tests) for the app:

```bash
yarn workspace happy-app typecheck
```

!!! danger "Contributor expectation"
    Passing unit tests alone may not be enough — maintainers often want evidence that the app or CLI actually works end-to-end for user-visible changes.
