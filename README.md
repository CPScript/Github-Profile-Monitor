# Github User Monitor

A comprehensive system for tracking GitHub followers with automated data collection, change detection, and a sleek dashboard interface. The system uses GitHub Actions for automation and GitHub Pages for hosting.

## Features

- **Automated Follower Tracking**: Monitors follower changes every 6 hours via GitHub Actions
- **Change Detection**: Identifies new followers and unfollowers with detailed logging
- **Repository Traffic**: Tracks profile repository views and clones (when available)
- **Historical Data**: Maintains up to 100 historical snapshots with trend analysis
- **Live Dashboard**: GitHub-styled responsive web interface
- **REST API**: JSON endpoints for external integration
- **Zero Dependencies**: Pure JavaScript implementation using only Node.js built-ins

## System Architecture

```
├── .github/workflows/monitor_followers.yml  # GitHub Actions automation
├── scripts/monitor.js                       # Core monitoring logic
├── dashboard/index.html                     # Web dashboard
├── data/                                    # Generated data files
│   ├── latest.json                         # Current snapshot
│   ├── stats.json                          # Summary statistics
│   ├── followers.json                      # Current followers list
│   └── history.json                        # Historical data
└── package.json                            # Project metadata
```

## Setup Instructions

### 1. Repository Setup

1. Create a new repository named `github-follower-monitor` (or any name)
2. Clone the repository locally
3. Copy all provided files to your repository:
   ```bash
   mkdir -p .github/workflows scripts dashboard data
   # Copy the workflow file to .github/workflows/monitor_followers.yml
   # Copy the monitor script to scripts/monitor.js
   # Copy the dashboard to dashboard/index.html
   # Copy package.json to root
   ```

### 2. GitHub Token Configuration

1. Go to GitHub Settings > Developer Settings > Personal Access Tokens > Tokens (classic)
2. Generate a new token with the following scopes:
   - `repo` (for repository access)
   - `read:user` (for user data)
   - `read:org` (if monitoring organization followers)
3. Copy the token value

### 3. Repository Secrets

1. In your repository, go to Settings > Secrets and Variables > Actions
2. Add the following secrets:
   - `GITHUB_TOKEN`: Your personal access token from step 2

### 4. GitHub Pages Setup

1. Go to Settings > Pages
2. Source: Deploy from a branch
3. Branch: `main` (or your default branch)
4. Folder: `/dashboard`
5. Save the configuration

### 5. Initial Run

1. Commit and push all files to your repository
2. Go to Actions tab and manually trigger the "Monitor GitHub Followers" workflow
3. Wait for the workflow to complete (should take 1-2 minutes)
4. Your dashboard will be available at: `https://USERNAME.github.io/REPOSITORY-NAME/`

## File Structure Details

### GitHub Actions Workflow (`.github/workflows/monitor_followers.yml`)
- Runs every 6 hours automatically
- Can be triggered manually
- Executes the monitoring script
- Commits data changes
- Deploys the dashboard to GitHub Pages

### Monitor Script (`scripts/monitor.js`)
Core monitoring logic implementing:
- **API Communication**: Direct HTTPS requests to GitHub API without external dependencies
- **Follower Comparison**: Detects new followers and unfollowers by comparing user IDs
- **Data Persistence**: Saves JSON files to the data directory
- **Traffic Monitoring**: Fetches repository view/clone statistics
- **Error Handling**: Comprehensive error handling with informative logging
- **Rate Limit Awareness**: Handles GitHub API rate limits appropriately

### Dashboard (`dashboard/index.html`)
Single-file web application featuring:
- **GitHub-Styled UI**: Matches GitHub's design system with CSS custom properties
- **Responsive Design**: Mobile-friendly responsive layout
- **Real-time Data**: Fetches latest data from JSON endpoints
- **Interactive Tabs**: Switch between dashboard, followers, and API documentation
- **Auto-refresh**: Updates data every 5 minutes
- **Error Handling**: Graceful handling of missing or invalid data

## API Endpoints

Once deployed, your system exposes the following endpoints:

| Endpoint | Description |
|----------|-------------|
| `/data/latest.json` | Current snapshot with profile, followers, and recent changes |
| `/data/stats.json` | Summary statistics and growth metrics |
| `/data/history.json` | Historical data (last 100 snapshots) |
| `/data/followers.json` | Complete current followers list with user details |

### Example API Usage

```javascript
// Fetch current stats
const response = await fetch('https://USERNAME.github.io/REPOSITORY-NAME/data/stats.json');
const stats = await response.json();
console.log(`Current followers: ${stats.current_followers}`);
console.log(`7-day growth: ${stats.growth_7d}`);

// Fetch latest changes
const latest = await fetch('https://USERNAME.github.io/REPOSITORY-NAME/data/latest.json');
const data = await latest.json();
console.log(`New followers: ${data.changes.new_followers.length}`);
```

## Data Structure

### Latest Snapshot (`latest.json`)
```json
{
  "timestamp": "2024-01-15T12:00:00.000Z",
  "profile": {
    "login": "username",
    "name": "Display Name",
    "bio": "User bio",
    "followers_count": 150,
    "following_count": 75,
    "public_repos": 25,
    "avatar_url": "https://avatars.githubusercontent.com/u/..."
  },
  "followers": {
    "count": 150,
    "list": [...]
  },
  "changes": {
    "new_followers": [...],
    "unfollowers": [...]
  },
  "traffic": {
    "repository": {...},
    "views": {...},
    "clones": {...}
  }
}
```

### Statistics (`stats.json`)
```json
{
  "current_followers": 150,
  "total_new_followers": 45,
  "total_unfollowers": 12,
  "growth_7d": 5,
  "growth_30d": 18,
  "max_followers": 155,
  "min_followers": 120,
  "avg_followers": 142,
  "last_updated": "2024-01-15T12:00:00.000Z",
  "monitoring_since": "2024-01-01T00:00:00.000Z"
}
```

## Customization

### Monitoring Frequency
Edit the cron expression in `.github/workflows/monitor_followers.yml`:
```yaml
schedule:
  - cron: '0 */6 * * *'  # Every 6 hours
  # - cron: '0 */1 * * *'  # Every hour
  # - cron: '0 0 * * *'    # Daily at midnight
```

### Data Retention
Modify the history limit in `scripts/monitor.js`:
```javascript
// Keep last 100 entries
if (history.length > 100) {
    history.splice(100);  // Change 100 to desired limit
}
```

### Dashboard Styling
The dashboard uses CSS custom properties for theming. Modify the `:root` variables in the `<style>` section to customize colors and appearance.

## Troubleshooting

### Common Issues

1. **Workflow fails with "Bad credentials"**
   - Verify your GitHub token has the correct scopes
   - Ensure the token is added as a repository secret named `GITHUB_TOKEN`

2. **No data appearing on dashboard**
   - Check that the workflow has run successfully in the Actions tab
   - Verify that data files exist in the `data/` directory
   - Ensure GitHub Pages is configured correctly

3. **API rate limit errors**
   - The system handles rate limits automatically
   - Consider reducing monitoring frequency for accounts with many followers

4. **Dashboard not loading**
   - Check browser console for JavaScript errors
   - Verify GitHub Pages deployment status
   - Ensure all files are in the correct directories

### Debug Mode
Enable verbose logging by adding debug statements to the monitor script:
```javascript
console.log('Debug: Current followers count:', followers.length);
console.log('Debug: API response:', JSON.stringify(data, null, 2));
```

## Security Considerations

- **Token Security**: Never commit your GitHub token to the repository
- **Scope Limitation**: Use minimal required token scopes
- **Public Data**: All monitored data becomes public via GitHub Pages
- **API Limits**: System respects GitHub API rate limits

## License

MIT License - See LICENSE file for details

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## Support

For issues and questions:
1. Check the troubleshooting section above
2. Review GitHub Actions logs for error details
3. Open an issue in the repository with detailed information
