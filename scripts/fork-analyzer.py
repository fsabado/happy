#!/usr/bin/env python3
"""
Analyze GitHub forks to discover pullable changes.

Usage:
  python3 scripts/fork-analyzer.py slopus/happy
  python3 scripts/fork-analyzer.py slopus/happy --limit 10
  python3 scripts/fork-analyzer.py slopus/happy --fork PavelPotapov/happy --branches

Output Formats:
  --toon    TOON format (requires: pip install 'git+https://github.com/toon-format/toon-python.git')
  --json    JSON format
  (default) Human-readable text
"""

import argparse
import json
import subprocess
import sys
from datetime import datetime
from typing import Any

try:
    from toon_format import encode
    TOON_AVAILABLE = True
except ImportError:
    TOON_AVAILABLE = False
    TOON_INSTALL_MSG = "Install toon-python for TOON output: pip install 'git+https://github.com/toon-format/toon-python.git'"


def gh_api(path: str, jq: str | None = None) -> list[dict[str, Any]] | dict[str, Any]:
    """Call GitHub API via gh CLI."""
    cmd = ["gh", "api", path]
    if jq:
        cmd.extend(["--jq", jq])

    result = subprocess.run(cmd, capture_output=True, text=True, check=True)
    return json.loads(result.stdout)


def get_forks(repo: str, limit: int = 100) -> list[dict[str, Any]]:
    """Get all forks of a repository."""
    return gh_api(f"repos/{repo}/forks?per_page={limit}")


def get_branches(fork_full_name: str) -> list[dict[str, Any]]:
    """Get non-main/master branches from a fork."""
    branches = gh_api(f"repos/{fork_full_name}/branches")
    return [b for b in branches if b["name"] not in ("main", "master")]


def get_commits(fork_full_name: str, sha: str | None = None, limit: int = 50) -> list[dict[str, Any]]:
    """Get commits from a fork branch or default branch."""
    path = f"repos/{fork_full_name}/commits?per_page={limit}"
    if sha:
        path += f"&sha={sha}"
    return gh_api(path)


def get_upstream_commits(upstream: str, limit: int = 200) -> set[str]:
    """Get commit SHAs from upstream main branch."""
    all_commits = []
    page = 1
    while page * 100 <= limit:
        commits = gh_api(f"repos/{upstream}/commits?per_page=100&page={page}")
        if not commits:
            break
        all_commits.extend(commits)
        page += 1
    return {c["sha"] for c in all_commits}


def filter_unique_commits(fork_commits: list[dict[str, Any]], upstream_shas: set[str]) -> list[dict[str, Any]]:
    """Filter out commits that already exist in upstream."""
    unique = []
    for commit in fork_commits:
        if commit["sha"] not in upstream_shas:
            unique.append(commit)
        else:
            break
    return unique


def format_commit(commit: dict[str, Any]) -> str:
    """Format a commit for display."""
    sha = commit["sha"][:7]
    msg = commit["commit"]["message"].split("\n")[0][:70]
    return f"{sha} - {msg}"


def output_toon(results: list[dict[str, Any]], show_all_commits: bool = False) -> None:
    """Output results in TOON (Token-Oriented Object Notation) format using official library."""
    if not TOON_AVAILABLE:
        raise ImportError(f"toon-format library not installed.\n{TOON_INSTALL_MSG}")

    # Build TOON data structure
    toon_data = {
        "meta": {
            "generated": datetime.now().isoformat(),
            "fork_count": len(results)
        },
        "forks": []
    }

    for r in results:
        fork_entry = {
            "full_name": r["full_name"],
            "stars": r["stars"],
            "updated": r["updated"],
            "unique_count": r.get("unique_count", 0),
            "branches_count": len(r.get("branches", [])),
            "recent_commits": r["recent_commits"][:8]
        }

        # Add branches if present
        if r.get("branches"):
            fork_entry["branches"] = []
            for b in r["branches"]:
                branch_entry = {
                    "name": b["name"],
                    "unique_count": b["unique_count"],
                    "commits": b["commits"][:5]
                }
                fork_entry["branches"].append(branch_entry)

        toon_data["forks"].append(fork_entry)

    # Output TOON format
    print(f"# Fork analysis results")
    print(f"# Generated: {datetime.now().isoformat()}")
    print()
    print(encode(toon_data))


def output_json(results: list[dict[str, Any]], show_all_commits: bool = False) -> None:
    """Output results in JSON format."""
    json_data = {
        "meta": {
            "generated": datetime.now().isoformat(),
            "fork_count": len(results)
        },
        "forks": []
    }

    for r in results:
        fork_entry = {
            "full_name": r["full_name"],
            "stars": r["stars"],
            "updated": r["updated"],
            "unique_count": r.get("unique_count", 0),
            "branches_count": len(r.get("branches", [])),
            "recent_commits": r["recent_commits"][:8]
        }

        # Add branches if present
        if r.get("branches"):
            fork_entry["branches"] = []
            for b in r["branches"]:
                branch_entry = {
                    "name": b["name"],
                    "unique_count": b["unique_count"],
                    "commits": b["commits"][:5]
                }
                fork_entry["branches"].append(branch_entry)

        json_data["forks"].append(fork_entry)

    print(json.dumps(json_data, indent=2))


def analyze_fork(fork: dict[str, Any], upstream: str, upstream_shas: set[str], include_branches: bool = False) -> dict[str, Any]:
    """Analyze a single fork for interesting changes."""
    owner = fork["owner"]["login"]
    full_name = fork["full_name"]
    result = {
        "owner": owner,
        "full_name": full_name,
        "stars": fork["stargazers_count"],
        "updated": fork["updated_at"][:10],
        "branches": [],
        "recent_commits": [],
    }

    # Get recent commits from default branch, filter out upstream commits
    commits = get_commits(full_name, limit=50)
    unique_commits = filter_unique_commits(commits, upstream_shas)
    result["recent_commits"] = [format_commit(c) for c in unique_commits[:8]]
    result["unique_count"] = len(unique_commits)

    # Get non-main branches if requested
    if include_branches:
        branches = get_branches(full_name)
        for branch in branches[:5]:
            branch_commits = get_commits(full_name, sha=branch["name"], limit=100)
            unique_branch_commits = filter_unique_commits(branch_commits, upstream_shas)
            if unique_branch_commits:
                result["branches"].append({
                    "name": branch["name"],
                    "commits": [format_commit(c) for c in unique_branch_commits[:5]],
                    "unique_count": len(unique_branch_commits),
                })

    return result


def main() -> None:
    parser = argparse.ArgumentParser(description="Analyze GitHub forks for pullable changes")
    parser.add_argument("repo", help="Repository to analyze (e.g., slopus/happy)")
    parser.add_argument("--limit", type=int, default=30, help="Number of forks to analyze (default: 30)")
    parser.add_argument("--fork", help="Analyze a specific fork only")
    parser.add_argument("--branches", action="store_true", help="Include branch analysis")
    parser.add_argument("--no-filter", action="store_true", help="Show all commits (don't filter upstream)")
    parser.add_argument("--toon", action="store_true", help="Output in TOON format instead of human-readable text")
    parser.add_argument("--json", action="store_true", help="Output in JSON format instead of human-readable text")
    args = parser.parse_args()

    # Validate mutually exclusive output formats
    if args.toon and args.json:
        parser.error("--toon and --json are mutually exclusive. Use only one output format.")

    # Get upstream commits for filtering
    upstream_shas = set()
    if not args.no_filter:
        print(f"Fetching upstream commits from {args.repo}...", file=sys.stderr)
        upstream_shas = get_upstream_commits(args.repo, limit=200)
        print(f"  Loaded {len(upstream_shas)} upstream commits\n", file=sys.stderr)

    if args.fork:
        # Analyze single fork
        fork_data = gh_api(f"repos/{args.fork}")
        results = [analyze_fork(fork_data, args.repo, upstream_shas, include_branches=args.branches)]
    else:
        # Analyze all forks
        forks = get_forks(args.repo, limit=args.limit)
        print(f"Found {len(forks)} forks. Analyzing...\n", file=sys.stderr)

        results = [analyze_fork(fork, args.repo, upstream_shas, include_branches=args.branches) for fork in forks]

    # Filter out forks with no unique commits
    results = [r for r in results if r["recent_commits"] or r["branches"]]

    # Sort by unique commits count, then stars, then recency
    results.sort(key=lambda x: (x.get("unique_count", 0), x["stars"], x["updated"]), reverse=True)

    # Display results
    if args.toon:
        output_toon(results, show_all_commits=args.no_filter)
    elif args.json:
        output_json(results, show_all_commits=args.no_filter)
    else:
        for r in results:
            print(f"{'='*60}")
            unique_info = f" ({r.get('unique_count', 0)} unique commits)" if not args.no_filter else ""
            print(f"🍴 {r['full_name']} ⭐ {r['stars']} | updated: {r['updated']}{unique_info}")
            print(f"{'='*60}")

            if r["branches"]:
                print("\n📌 Branches:")
                for b in r["branches"]:
                    count_info = f" ({b['unique_count']} unique)" if not args.no_filter else ""
                    print(f"  • {b['name']}{count_info}")
                    for c in b["commits"]:
                        print(f"    {c}")

            print(f"\n📝 Recent commits:")
            if r["recent_commits"]:
                for c in r["recent_commits"]:
                    print(f"  {c}")
            else:
                print("  (no unique commits)")
            print()


if __name__ == "__main__":
    main()
