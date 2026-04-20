

## Testing and Local Deployment

Kill and deploy
```
pkill -f "expo start" 2>/dev/null; pkill -f "node.*happy" 2>/dev/null; cd ~/src/happy/.worktrees/refresh-button/packages/happy-app && pnpm web
```


