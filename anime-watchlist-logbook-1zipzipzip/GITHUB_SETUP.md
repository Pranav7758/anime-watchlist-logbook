# GitHub Repository Setup Guide

Your code has been committed locally. Follow these steps to create a GitHub repository and push your code:

## Step 1: Create a New Repository on GitHub

1. Go to [GitHub.com](https://github.com) and sign in
2. Click the **"+"** icon in the top right corner
3. Select **"New repository"**
4. Fill in the repository details:
   - **Repository name**: `anime-logbook` (or any name you prefer)
   - **Description**: "A modern web application for tracking your anime watchlist"
   - **Visibility**: Choose Public or Private
   - **DO NOT** initialize with README, .gitignore, or license (we already have these)
5. Click **"Create repository"**

## Step 2: Push Your Code to GitHub

After creating the repository, GitHub will show you commands. Use these commands in your terminal:

```bash
# Add the remote repository (replace YOUR_USERNAME with your GitHub username)
git remote add origin https://github.com/YOUR_USERNAME/anime-logbook.git

# Rename the branch to main (if needed)
git branch -M main

# Push your code to GitHub
git push -u origin main
```

## Alternative: Using SSH (if you have SSH keys set up)

```bash
# Add the remote repository (replace YOUR_USERNAME with your GitHub username)
git remote add origin git@github.com:YOUR_USERNAME/anime-logbook.git

# Rename the branch to main (if needed)
git branch -M main

# Push your code to GitHub
git push -u origin main
```

## Step 3: Verify

After pushing, refresh your GitHub repository page. You should see all your files uploaded!

## Troubleshooting

If you get authentication errors:
- Make sure you're signed in to GitHub
- You may need to use a Personal Access Token instead of password
- Or set up SSH keys for easier authentication

## Next Steps

Once your code is on GitHub:
- You can share the repository URL with others
- Set up GitHub Actions for CI/CD (optional)
- Add collaborators if needed
- Create issues and pull requests for future development

