const https = require('https');
const fs = require('fs');
const path = require('path');

class GitHubMonitor {
    constructor(username, token) {
        this.username = username;
        this.token = token;
        this.dataDir = path.join(__dirname, '../data');
        this.apiBase = 'api.github.com';
        
        // Ensure data directory exists
        if (!fs.existsSync(this.dataDir)) {
            fs.mkdirSync(this.dataDir, { recursive: true });
        }
    }

    makeRequest(endpoint) {
        return new Promise((resolve, reject) => {
            const options = {
                hostname: this.apiBase,
                port: 443,
                path: endpoint,
                method: 'GET',
                headers: {
                    'Authorization': `token ${this.token}`,
                    'User-Agent': 'GitHub-Follower-Monitor',
                    'Accept': 'application/vnd.github.v3+json'
                }
            };

            const req = https.request(options, (res) => {
                let data = '';
                res.on('data', chunk => data += chunk);
                res.on('end', () => {
                    if (res.statusCode >= 200 && res.statusCode < 300) {
                        try {
                            resolve(JSON.parse(data));
                        } catch (e) {
                            resolve(data);
                        }
                    } else {
                        reject(new Error(`HTTP ${res.statusCode}: ${data}`));
                    }
                });
            });

            req.on('error', reject);
            req.end();
        });
    }

    async getAllFollowers() {
        let followers = [];
        let page = 1;
        const perPage = 100;

        while (true) {
            const data = await this.makeRequest(`/users/${this.username}/followers?page=${page}&per_page=${perPage}`);
            if (!data || data.length === 0) break;
            
            followers = followers.concat(data.map(user => ({
                id: user.id,
                login: user.login,
                avatar_url: user.avatar_url,
                html_url: user.html_url,
                type: user.type,
                followed_at: new Date().toISOString()
            })));

            if (data.length < perPage) break;
            page++;
        }

        return followers;
    }

    async getRepositoryTraffic() {
        try {
            const repoData = await this.makeRequest(`/repos/${this.username}/${this.username}`);
            const viewsData = await this.makeRequest(`/repos/${this.username}/${this.username}/traffic/views`);
            const clonesData = await this.makeRequest(`/repos/${this.username}/${this.username}/traffic/clones`);
            
            return {
                repository: {
                    name: repoData.name,
                    stars: repoData.stargazers_count,
                    forks: repoData.forks_count,
                    watchers: repoData.watchers_count
                },
                views: viewsData,
                clones: clonesData
            };
        } catch (error) {
            console.log('Repository traffic data not available (repository may not exist or be private)');
            return null;
        }
    }

    async getUserProfile() {
        return await this.makeRequest(`/users/${this.username}`);
    }

    loadPreviousData(filename) {
        const filepath = path.join(this.dataDir, filename);
        if (fs.existsSync(filepath)) {
            try {
                return JSON.parse(fs.readFileSync(filepath, 'utf8'));
            } catch (e) {
                console.log(`Error reading ${filename}:`, e.message);
                return null;
            }
        }
        return null;
    }

    saveData(filename, data) {
        const filepath = path.join(this.dataDir, filename);
        fs.writeFileSync(filepath, JSON.stringify(data, null, 2));
    }

    compareFollowers(current, previous) {
        const currentIds = new Set(current.map(f => f.id));
        const previousIds = new Set((previous || []).map(f => f.id));

        const newFollowers = current.filter(f => !previousIds.has(f.id));
        const unfollowers = (previous || []).filter(f => !currentIds.has(f.id));

        return { newFollowers, unfollowers };
    }

    async run() {
        console.log(`Starting follower monitoring for ${this.username}...`);
        
        try {
            // Get current data
            const [followers, profile, traffic] = await Promise.all([
                this.getAllFollowers(),
                this.getUserProfile(),
                this.getRepositoryTraffic()
            ]);

            // Load previous data
            const previousFollowers = this.loadPreviousData('followers.json');
            const history = this.loadPreviousData('history.json') || [];

            // Compare followers
            const { newFollowers, unfollowers } = this.compareFollowers(followers, previousFollowers);

            // Create current snapshot
            const snapshot = {
                timestamp: new Date().toISOString(),
                profile: {
                    login: profile.login,
                    name: profile.name,
                    bio: profile.bio,
                    public_repos: profile.public_repos,
                    followers_count: profile.followers,
                    following_count: profile.following,
                    created_at: profile.created_at,
                    avatar_url: profile.avatar_url
                },
                followers: {
                    count: followers.length,
                    list: followers
                },
                changes: {
                    new_followers: newFollowers,
                    unfollowers: unfollowers
                },
                traffic: traffic
            };

            // Update history
            history.unshift(snapshot);
            // Keep last 100 entries
            if (history.length > 100) {
                history.splice(100);
            }

            // Save data
            this.saveData('followers.json', followers);
            this.saveData('history.json', history);
            this.saveData('latest.json', snapshot);

            // Generate summary stats
            const stats = this.generateStats(history);
            this.saveData('stats.json', stats);

            console.log(`✓ Monitoring complete:`);
            console.log(`  Current followers: ${followers.length}`);
            console.log(`  New followers: ${newFollowers.length}`);
            console.log(`  Unfollowers: ${unfollowers.length}`);

            if (newFollowers.length > 0) {
                console.log('  New followers:', newFollowers.map(f => f.login).join(', '));
            }
            if (unfollowers.length > 0) {
                console.log('  Unfollowers:', unfollowers.map(f => f.login).join(', '));
            }

        } catch (error) {
            console.error('Error during monitoring:', error.message);
            process.exit(1);
        }
    }

    generateStats(history) {
        if (history.length === 0) return {};

        const latest = history[0];
        const followerCounts = history.map(h => h.followers.count).filter(c => c !== undefined);
        
        // Calculate trends
        const last7Days = history.filter(h => 
            new Date(h.timestamp) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
        );
        const last30Days = history.filter(h => 
            new Date(h.timestamp) > new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
        );

        const growth7d = last7Days.length >= 2 ? 
            last7Days[0].followers.count - last7Days[last7Days.length - 1].followers.count : 0;
        const growth30d = last30Days.length >= 2 ? 
            last30Days[0].followers.count - last30Days[last30Days.length - 1].followers.count : 0;

        return {
            current_followers: latest.followers.count,
            total_new_followers: history.reduce((sum, h) => sum + h.changes.new_followers.length, 0),
            total_unfollowers: history.reduce((sum, h) => sum + h.changes.unfollowers.length, 0),
            growth_7d: growth7d,
            growth_30d: growth30d,
            max_followers: Math.max(...followerCounts),
            min_followers: Math.min(...followerCounts),
            avg_followers: Math.round(followerCounts.reduce((a, b) => a + b, 0) / followerCounts.length),
            last_updated: latest.timestamp,
            monitoring_since: history[history.length - 1]?.timestamp || latest.timestamp
        };
    }
}

// Main execution
async function main() {
    const username = process.env.GITHUB_USERNAME;
    const token = process.env.TOKEN;

    if (!username || !token) {
        console.error('Error: GITHUB_USERNAME and TOKEN environment variables are required');
        process.exit(1);
    }

    const monitor = new GitHubMonitor(username, token);
    await monitor.run();
}

if (require.main === module) {
    main().catch(error => {
        console.error('Fatal error:', error);
        process.exit(1);
    });
}
