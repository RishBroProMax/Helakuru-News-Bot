# <p align="center">Helakuru News Bot V1.4 Alpha 📢</p>

<p align="center">
  <img src="logo.jpg" alt="Helakuru News Bot Logo" width="250" height="250" style="border-radius: 50%;" />
</p>

<p align="center">
  <a href="https://discord.com/oauth2/authorize?client_id=1306259513090769027&permissions=277025392704&integration_type=0&scope=bot">
    <img src="https://img.shields.io/badge/Add%20Me%20to%20Your%20Server-7289DA?style=for-the-badge&logo=discord&logoColor=white" alt="Add Me to Your Server" />
  </a>
</p>

<p align="center">
  Stay up-to-date with the latest news from <strong>Helakuru Esana</strong> directly on your Discord server! This bot automatically fetches and shares real-time news updates, complete with images, summaries, and links to full articles. Perfect for keeping your community informed and engaged with important updates.
</p>

### Features 🚀

- **Real-time News Updates:** Fetches the latest articles from Helakuru Esana every 5 minutes.
- **News Channels:** Designate specific channels in each server for news updates.
- **User Notifications:** Allows users to receive news directly in their DMs.
- **Customizable Commands:** Admins can set and unregister channels, check status, and view the bot's latency.
- **Flexible Setup:** Easy to configure with simple commands and built-in error handling.

### Commands 📕

| Command             | Description                                               |
|---------------------|-----------------------------------------------------------|
| `!setnews`          | Sets the current channel to receive news updates (Admin). |
| `!unregisternews`   | Removes the channel from receiving updates (Admin).       |
| `!newsnotify on/off`| Enables/disables DM notifications for users.             |
| `!newsstatus`       | Shows the current configuration of news updates.          |
| `!news`             | Sends a test news message.                                |
| `!newshelp`         | Shows the help message with all commands.                 |
| `!ping`             | Checks the bot latency.                                   |
| `!refresh`          | Manually checks for the latest news.                      |
</p>

### How to Get Started 🛠️

1. **Invite the bot** to your Discord server by clicking [here](https://discord.com/oauth2/authorize?client_id=1306259513090769027&permissions=277025392704&integration_type=0&scope=bot).
2. **Set up the news channel** where updates will be sent by using the `!setnews` command.
3. **Enable notifications** to keep users updated directly in their DMs using `!newsnotify on`.

Once the setup is done, your server will start receiving **Helakuru Esana** news every 5 minutes! 🎉

### Technical Details 🧑‍💻

- **Platform:** Built with [Discord.js v14](https://discord.js.org) and powered by [Node.js](https://nodejs.org).
- **Hosting:** Deployable on various cloud platforms such as Heroku, Vercel, or DigitalOcean.
- **Dependencies:**
  - [axios](https://www.npmjs.com/package/axios) – HTTP request library for fetching news.
  - [cheerio](https://www.npmjs.com/package/cheerio) – jQuery-like library for scraping news data.
  - [node-cron](https://www.npmjs.com/package/node-cron) – Cron job scheduler for regular updates.

### Upcoming Features 🌟

- **Scheduled News Delivery:** Ability to send updates at scheduled intervals (e.g., hourly, daily).
- **Interactive News Feed:** Engage your community with reactions and replies to news updates.

### Credits ❤

- **Rishmika Sandanu** (Developer)
- **Helakuru Esana Web** (News Source)

---

<p align="center">
Feel free to contribute to this bot by reporting bugs or submitting new features. If you'd like to request a feature or need support, contact me via Discord at **ImRishmika**.
</p>
