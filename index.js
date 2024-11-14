const { Client, GatewayIntentBits, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, PermissionsBitField } = require('discord.js');
const axios = require('axios');
const cheerio = require('cheerio');
const cron = require('node-cron');

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.DirectMessages,
    ],
});

let serverChannels = {};  // Stores server-specific channels for news updates
let userNotifications = {};  // Stores users who opted for DM notifications
let lastNewsId = 106207;  // Initialize from last known news ID
const prefix = '!';

const BOT_TOKEN = 'YOUR_BOT_TOKEN_HERE';  // Replace with your actual bot token

client.on('ready', async () => {
    // Log messages in a sequence with delays to simulate a loading process
    console.log(`
    ╔══════════════════════════════════════╗
    ║ 🚀 Initializing ${client.user.tag}...      ║
    ╚══════════════════════════════════════╝
    `);

    // Array of loading messages
    const loadingMessages = [
        'Connecting to Helakuru Web 🖥️...',
        'Fetching latest news data 📡...',
        'Synchronizing with Discord API 🤖...',
        'Setting up channels and permissions 🔐...',
        'Finalizing configurations ⚙️...',
        'Almost ready to go! 🔥'
    ];

    // Display each loading message with a delay
    for (const message of loadingMessages) {
        await new Promise(resolve => setTimeout(resolve, 1500));  // 1.5-second delay
        console.log(message);
    }

    // Final message indicating bot is fully online
    console.log(`
    ╔═════════════════════════════════════════╗
    ║ ✅ Bot ${client.user.tag} is now online!      ║
    ║   Watching Helakuru Esana News 📰           ║
    ╚═════════════════════════════════════════╝
    `);

    // Set bot activity after loading sequence
    client.user.setActivity('Helakuru Esana News 📰', { type: 'WATCHING' });
});

async function fetchLatestNews(sendToAll = true) {
    try {
        const newsUrl = `https://www.helakuru.lk/esana/news/${lastNewsId + 1}`;
        const { data } = await axios.get(newsUrl);
        const $ = cheerio.load(data);

        const newsTitle = $('meta[property="og:title"]').attr('content') || "Untitled News";
        const newsContent = $('meta[property="og:description"]').attr('content') || "No content available.";
        const newsImage = $('meta[property="og:image"]').attr('content') || "";

        if (newsTitle && newsContent) {
            lastNewsId += 1;

            const embed = new EmbedBuilder()
                .setTitle(`📰 ${newsTitle}`)
                .setDescription(`${newsContent}\n\n[Read More 📕](${newsUrl})`)
                .setImage(newsImage)
                .setColor('#00bfff')
                .setTimestamp()
                .setFooter({ text: 'Helakuru Esana News • Stay informed! | ⚡ Powered By Rish Studio' });

            const row = new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setLabel('Read Full Article 📖')
                    .setStyle(ButtonStyle.Link)
                    .setURL(newsUrl)
            );

            if (sendToAll) {
                for (const guildId in serverChannels) {
                    try {
                        const channel = await client.channels.fetch(serverChannels[guildId]);
                        if (channel) {
                            await channel.send({ embeds: [embed], components: [row] });
                        }
                    } catch (error) {
                        console.error(`⚠️ Error sending news to channel in guild ${guildId}:`, error);
                    }
                }

                for (const userId in userNotifications) {
                    try {
                        const user = await client.users.fetch(userId);
                        if (user) {
                            await user.send({ embeds: [embed], components: [row] });
                        }
                    } catch (error) {
                        console.error(`⚠️ Error sending news to user ${userId}:`, error);
                    }
                }
            } else {
                return { embeds: [embed], components: [row] };
            }
        } else {
            console.log('📭 No new news found');
        }
    } catch (error) {
        console.error('❌ Error fetching news:', error);
    }
}

// Schedule to check for new news every 5 minutes
cron.schedule('*/5 * * * *', fetchLatestNews);

client.on('messageCreate', async (message) => {
    if (message.author.bot || !message.content.startsWith(prefix)) return;

    const [command, ...args] = message.content.slice(prefix.length).trim().split(/\s+/);
    const userId = message.author.id;
    const guildId = message.guild?.id;

    try {
        switch (command) {
            case 'setnews':
                if (message.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
                    serverChannels[guildId] = message.channel.id;
                    message.reply('✅ This channel is now set for Helakuru Esana news updates! 📰');
                } else {
                    message.reply('⚠️ Only administrators can set the news channel!');
                }
                break;

            case 'unregisternews':
                if (message.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
                    delete serverChannels[guildId];
                    message.reply('🚫 This channel has been unregistered from Helakuru Esana news updates.');
                } else {
                    message.reply('⚠️ Only administrators can unregister the news channel!');
                }
                break;

            case 'newsnotify':
                if (args[0] === 'on') {
                    userNotifications[userId] = true;
                    message.reply('🔔 You will now receive news updates via DM!');
                } else if (args[0] === 'off') {
                    delete userNotifications[userId];
                    message.reply('🔕 You have turned off news updates in DMs.');
                } else {
                    message.reply('⚠️ Invalid option! Use `!newsnotify on` or `!newsnotify off`.');
                }
                break;

            case 'news':
                const testNews = await fetchLatestNews(false);
                if (testNews) {
                    await message.reply(testNews);
                } else {
                    message.reply('⚠️ No available news to display.');
                }
                break;

            case 'newsstatus':
                const statusEmbed = new EmbedBuilder()
                    .setTitle('📊 News Bot Status')
                    .setColor('#00bfff')
                    .setDescription('Current bot configuration for news updates')
                    .addFields(
                        { name: 'Registered Channels', value: Object.keys(serverChannels).length > 0 ? Object.values(serverChannels).join(', ') : 'None' },
                        { name: 'Users Receiving DMs', value: Object.keys(userNotifications).length > 0 ? Object.keys(userNotifications).join(', ') : 'None' }
                    );
                message.reply({ embeds: [statusEmbed] });
                break;

            case 'ping':
                message.reply(`🏓 Pong! Bot latency: ${Date.now() - message.createdTimestamp}ms.`);
                break;

            case 'refresh':
                await fetchLatestNews(true);
                message.reply('🔄 Bot refreshed and latest news checked!');
                break;

            case 'newshelp':
                const helpEmbed = new EmbedBuilder()
                    .setTitle('📢 Helakuru Esana News Bot Commands')
                    .setColor('#0099ff')
                    .setDescription('Stay informed with real-time updates from Helakuru Esana!')
                    .addFields(
                        { name: '!setnews', value: 'Set this channel to receive news updates (admin only).' },
                        { name: '!unregisternews', value: 'Remove this channel from news updates (admin only).' },
                        { name: '!newsnotify', value: 'Enable or disable direct message notifications for yourself.' },
                        { name: '!newsstatus', value: 'Show the current configuration of news updates.' },
                        { name: '!news', value: 'Send a news message to verify setup.' },
                        { name: '!newshelp', value: 'Show this help message with all commands.' },
                        { name: '!ping', value: 'Check the bot latency.' },
                        { name: '!refresh', value: 'Manually check and send the latest news to registered channels and DMs.' }
                    );
                message.reply({ embeds: [helpEmbed] });
                break;

            default:
                message.reply('❓ Unknown command. Use `!newshelp` for a list of commands.');
        }
    } catch (error) {
        console.error(`❌ Error handling command ${command}:`, error);
        message.reply('⚠️ An error occurred while processing your request.');
    }
});

client.login(BOT_TOKEN);
