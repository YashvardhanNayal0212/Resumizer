# 🚀 Render Deployment Guide for Resumizer

## 📋 Complete Deployment Steps

### 1. Prepare Your Repository

1. **Create a GitHub repository** (if you haven't already):
   ```bash
   git init
   git add .
   git commit -m "Initial commit - Resumizer backend for Render"
   git branch -M main
   git remote add origin https://github.com/YOUR_USERNAME/resumizer.git
   git push -u origin main
   ```

2. **Verify your backend structure**:
   ```
   backend/
   ├── server.js
   ├── package.json
   ├── render.yaml
   └── .env.example
   ```

### 2. Deploy to Render

1. **Sign up for Render**: Go to [render.com](https://render.com) and create an account

2. **Create a new Web Service**:
   - Click **New → Web Service**
   - Connect your GitHub repository
   - Configure the service:
     - **Name**: `resumizer-backend`
     - **Runtime**: `Node`
     - **Build Command**: `npm install`
     - **Start Command**: `npm start`
     - **Root Directory**: `backend` (if using full repo)
     - **Plan**: Start with Free, upgrade to Starter ($7/month) for production

3. **Set Environment Variables**:
   In your Render service dashboard, go to **Environment** and add:
   ```
   ANTHROPIC_API_KEY = sk-ant-YOUR-ANTHROPIC-API-KEY
   NODE_ENV = production
   PORT = 10000
   ```

4. **Deploy**: Click **Create Web Service** - Render will automatically build and deploy

5. **Get your URL**: Your service will be available at `https://resumizer-backend.onrender.com`

### 3. Configure Your Anthropic API Key

1. **Get your API key** from [Anthropic Console](https://console.anthropic.com)
2. **Add it to Render**: In your service dashboard → Environment → Add Environment Variable
   - **Key**: `ANTHROPIC_API_KEY`
   - **Value**: `sk-ant-xxxxx` (your actual key)

### 4. Update the Extension

1. **Edit the backend URL** in `extension/background/background.js`:
   ```javascript
   // Line 4 - Update with your actual Render URL
   const BACKEND_URL = 'https://resumizer-backend.onrender.com';
   ```

2. **Load the extension** in Chrome:
   - Go to `chrome://extensions/`
   - Enable Developer Mode
   - Click "Load unpacked" and select the `extension/` folder

### 5. Test Everything

1. **Test the backend health**:
   ```bash
   curl https://resumizer-backend.onrender.com/health
   ```
   Should return: `{"status":"ok","ts":1234567890}`

2. **Test the extension**:
   - Upload a resume
   - Navigate to a job posting
   - Click "Analyze My Resume"

## 🔧 Troubleshooting

### Common Issues

**❌ "Could not read page" error**
- Make sure you're on a supported job site
- Try the manual paste option

**❌ "Backend not responding"**
- Check Render service logs
- Verify the URL in `background.js` is correct
- Ensure the service is deployed and running

**❌ "Rate limit exceeded"**
- Free plan: 5 analyses per IP per 24 hours
- This resets automatically

**❌ "Cold start delay"**
- Free Render plan has ~15-minute cold starts
- Upgrade to Starter plan for instant responses

### Render Specific Tips

- **Free plan limitations**: 15-minute cold starts, 750 hours/month
- **Starter plan ($7/month)**: No cold starts, better performance
- **Logs**: Check Render dashboard for deployment logs
- **Custom domain**: Add custom domain in Render settings (optional)

## 📊 Cost Comparison

| Plan | Cost | Features |
|------|------|----------|
| Render Free | $0 | 15-min cold starts, 750h/month |
| Render Starter | $7/month | No cold starts, instant response |
| Claude API | ~$0.003/analysis | Per-use pricing |
| **Total** | **$7-15/month** | For moderate usage |

## 🔄 Migration from Railway

If you're migrating from Railway:

1. **Update the backend URL** in `background.js`
2. **Re-deploy to Render** using the steps above
3. **Delete Railway service** (optional)
4. **Test the extension** with the new backend

## ✅ Production Checklist

- [ ] Anthropic API key set in Render environment
- [ ] Backend URL updated in extension
- [ ] Extension loads without errors
- [ ] Health endpoint responds correctly
- [ ] Full analysis workflow works
- [ ] Rate limiting is enforced
- [ ] History saves locally
- [ ] Download functionality works

## 🚀 Next Steps

Once deployed:
1. **Share the extension** with others
2. **Monitor usage** in Render dashboard
3. **Consider upgrading** to Starter plan for better performance
4. **Submit to Chrome Web Store** for public distribution

---

**Need help? Check Render's [Node.js deployment guide](https://render.com/docs/deploy-node-express-app)**
