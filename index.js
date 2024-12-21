// helakuru news bot
// V1.5 Alpha Beta 0.3
const {
    Client,
    GatewayIntentBits,
    EmbedBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    Intents,
    MessageActionRow, 
    MessageButton,
    PermissionsBitField,
    SlashCommandBuilder,
    Collection,
} = require('discord.js');
const axios = require('axios');
const cheerio = require('cheerio');
const cron = require('node-cron');
const fs = require('fs');
require('dotenv').config();

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.DirectMessages,
    ],
});

const BOT_TOKEN = process.env.BOT_TOKEN;
const OWNER_ID = '982206923220856842';
const newsFile = './news.txt';
const serverChannelsFile = './serverChannels.json';
const userNotificationsFile = './userNotifications.json';

client.commands = new Collection();
const sentNews = new Set(fs.existsSync(newsFile) ? fs.readFileSync(newsFile, 'utf8').split('\n') : []);
const serverChannels = readJsonFileSync(serverChannelsFile);
const userNotifications = readJsonFileSync(userNotificationsFile);
let lastNewsId = 106274;

// Helper Functions
function readJsonFileSync(filePath) {
    try {
        return fs.existsSync(filePath) ? JSON.parse(fs.readFileSync(filePath, 'utf8')) : {};
    } catch (error) {
        console.error(`Error reading ${filePath}:`, error);
        return {};
    }
}

function saveData(filePath, data) {
    try {
        fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
    } catch (error) {
        console.error(`Error saving to ${filePath}:`, error);
    }
}

// Register Slash Commands
client.on('ready', async () => {
    console.log(`✅ ${client.user.tag} is online and monitoring Helakuru Esana news.`);
    client.user.setPresence({
        activities: [{ name: 'Helakuru Esana News 📰', type: 'WATCHING' }],
        status: 'online',
    });
    const owner = await client.users.fetch(OWNER_ID);
    owner.send(`✅ ${client.user.tag} is online and actively monitoring Helakuru Esana news updates.`);

    // Register Slash Commands
    const commands = [
        new SlashCommandBuilder().setName('setnews').setDescription('📢 Set the current channel for news updates'),
        new SlashCommandBuilder().setName('removenews').setDescription('🚫 Remove the current channel from news updates'),
        new SlashCommandBuilder().setName('newsnotify').setDescription('🔔 Enable or disable DM news notifications for yourself'),
        new SlashCommandBuilder().setName('newsstatus').setDescription('📊 Show bot status and configured news channels/users'),
        new SlashCommandBuilder().setName('ping').setDescription('🏓 Check the bot latency'),
        new SlashCommandBuilder().setName('help').setDescription('📖 Show available bot commands'),
        new SlashCommandBuilder().setName('news').setDescription('📰 Fetch the latest news update manually'),
        new SlashCommandBuilder().setName('invite').setDescription('🔗 Get the invite link to add this bot to your server'),
        new SlashCommandBuilder().setName('controlpanel').setDescription('⚙️ Access bot control panel (Owner Only)'),
        new SlashCommandBuilder().setName('vote').setDescription('📡Vote Me'),
        new SlashCommandBuilder().setName('relese').setDescription('🎄 **Christmas Update Relese Notes** 🎅'),
        new SlashCommandBuilder().setName('christmas').setDescription('🎄 **Christmas Update** 🎅'),
        new SlashCommandBuilder().setName('stats').setDescription('📊 Show Bot Status (Owner Only)'),
    ].map(command => command.toJSON());

    await client.application.commands.set(commands);
});


const BOT_VERSION = '1.5 Alpha Beta 9';
let messagesProcessed = 0;

// Event: Interaction
client.on('interactionCreate', async (interaction) => {
    if (!interaction.isCommand() || interaction.commandName !== 'stats') return;

    if (interaction.user.id !== OWNER_ID) {
        return interaction.reply({ content: '❌ You are not authorized to use this command.', ephemeral: true });
    }

    const uptime = formatUptime(client.uptime);
    const latency = Math.round(client.ws.ping);
    const userCount = client.users.cache.size;
    const channelCount = client.channels.cache.size;
    const guildCount = client.guilds.cache.size;
    const memoryUsage = (process.memoryUsage().heapUsed / 1024 / 1024).toFixed(2);
    const cpuUsage = (process.cpuUsage().user / 1000000).toFixed(2);
    const commandCount = client.commands.size;

    const embed = new EmbedBuilder()
        .setTitle('📊 Bot Statistics')
        .setColor('#7289da')
        .addFields(
            { name: '🧩 Uptime', value: uptime, inline: true },
            { name: '🌏 Latency', value: `${latency}ms`, inline: true },
            { name: '👥 Total Users', value: `${userCount}`, inline: true },
            { name: '🎥 Total Channels', value: `${channelCount}`, inline: true },
            { name: '🌌 Total Servers', value: `${guildCount}`, inline: true },
            { name: '💾 Memory Usage', value: `${memoryUsage} MB`, inline: true },
            { name: '⚙️ CPU Usage', value: `${cpuUsage}%`, inline: true },
            { name: '📜 Commands Executed', value: `${commandCount}`, inline: true }
        )
        .setFooter({ text: `🔔 Helakuru News Bot V${BOT_VERSION} | Built By ImRishmika` })
        .setTimestamp();

    const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId('refresh_stats')
            .setLabel('🔄 Refresh')
            .setStyle(ButtonStyle.Primary),
        new ButtonBuilder()
            .setCustomId('more_details')
            .setLabel('ℹ️ More Details')
            .setStyle(ButtonStyle.Secondary)
    );

    await interaction.reply({ embeds: [embed], components: [row] });
});

// Handle Button Interactions
client.on('interactionCreate', async (buttonInteraction) => {
    if (!buttonInteraction.isButton()) return;

    if (buttonInteraction.user.id !== OWNER_ID) {
        return buttonInteraction.reply({ content: '❌ You are not authorized to use this action.', ephemeral: true });
    }

    if (buttonInteraction.customId === 'refresh_stats') {
        const uptime = formatUptime(client.uptime);
        const latency = Math.round(client.ws.ping);
        const userCount = client.users.cache.size;
        const channelCount = client.channels.cache.size;
        const guildCount = client.guilds.cache.size;
        const memoryUsage = (process.memoryUsage().heapUsed / 1024 / 1024).toFixed(2);
        const cpuUsage = (process.cpuUsage().user / 1000000).toFixed(2);
        const commandCount = client.commands.size;

        const embed = new EmbedBuilder()
            .setTitle('📊 Bot Statistics')
            .setColor('#7289da')
            .addFields(
                { name: '🧩 Uptime', value: uptime, inline: true },
                { name: '🌏 Latency', value: `${latency}ms`, inline: true },
                { name: '👥 Total Users', value: `${userCount}`, inline: true },
                { name: '🎥 Total Channels', value: `${channelCount}`, inline: true },
                { name: '🌌 Total Servers', value: `${guildCount}`, inline: true },
                { name: '💾 Memory Usage', value: `${memoryUsage} MB`, inline: true },
                { name: '⚙️ CPU Usage', value: `${cpuUsage}%`, inline: true },
                { name: '📜 Commands Executed', value: `${commandCount}`, inline: true }
            )
            .setFooter({ text: `🔔 Helakuru News Bot V${BOT_VERSION} | Built By ImRishmika` })
            .setTimestamp();

        await buttonInteraction.update({ embeds: [embed] });
    } else if (buttonInteraction.customId === 'more_details') {
        const embed = new EmbedBuilder()
            .setTitle('📊 More Bot Statistics')
            .setColor('#7289da')
            .addFields(
                { name: '🧩 Uptime', value: formatUptime(client.uptime), inline: true },
                { name: '🌏 Latency', value: `${Math.round(client.ws.ping)}ms`, inline: true },
                { name: '👥 Total Users', value: `${client.users.cache.size}`, inline: true },
                { name: '🎥 Total Channels', value: `${client.channels.cache.size}`, inline: true },
                { name: '🌌 Total Servers', value: `${client.guilds.cache.size}`, inline: true },
                { name: '💾 Memory Usage', value: `${(process.memoryUsage().heapUsed / 1024 / 1024).toFixed(2)} MB`, inline: true },
                { name: '⚙️ CPU Usage', value: `${(process.cpuUsage().user / 1000000).toFixed(2)}%`, inline: true },
                { name: '📜 Commands Executed', value: `${client.commands.size}`, inline: true },
                { name: '📨 Messages Processed', value: `${messagesProcessed}`, inline: true },
                { name: '🔄 Bot Version', value: `V${BOT_VERSION}`, inline: true }
            )
            .setFooter({ text: `🔔 Helakuru News Bot V${BOT_VERSION} | Built By ImRishmika` })
            .setTimestamp();

        await buttonInteraction.reply({ embeds: [embed], ephemeral: true });
    }
});

// Helper Function to Format Uptime
function formatUptime(uptime) {
    const days = Math.floor(uptime / (24 * 60 * 60 * 1000));
    const hours = Math.floor((uptime % (24 * 60 * 60 * 1000)) / (60 * 60 * 1000));
    const minutes = Math.floor((uptime % (60 * 60 * 1000)) / (60 * 1000));
    const seconds = Math.floor((uptime % (60 * 1000)) / 1000);
    return `${days}d ${hours}h ${minutes}m ${seconds}s`;
}

// Track messages processed
client.on('messageCreate', () => {
    messagesProcessed++;
});




async function fetchLatestNews(sendToAll = true) {
    console.log('🔍 Fetching the latest news...');
    try {
        const latestNewsUrls = await getLatestNewsUrls();
        const newsPromises = latestNewsUrls.map(newsUrl => fetchNewsByUrl(newsUrl, sendToAll));
        await Promise.all(newsPromises);
    } catch (error) {
        console.error('❌ General error fetching news:', error);
    }
}

async function getLatestNewsUrls() {
    const newsPageUrl = 'https://www.helakuru.lk/esana/news';
    try {
        const { data } = await axios.get(newsPageUrl);
        const $ = cheerio.load(data);
        const newsUrls = [];

        $('a.news-link').each((index, element) => {
            const newsUrl = $(element).attr('href');
            if (newsUrl && !sentNews.has(newsUrl)) {
                newsUrls.push(`https://www.helakuru.lk${newsUrl}`);
            }
        });

        return newsUrls;
    } catch (error) {
        console.error('⚠️ Error fetching latest news URLs:', error);
        return [];
    }
}

async function fetchNewsByUrl(newsUrl, sendToAll) {
    try {
        const { data } = await axios.get(newsUrl);
        const $ = cheerio.load(data);
        const newsTitle = $('meta[property="og:title"]').attr('content') || "Untitled News";
        const newsContent = $('meta[property="og:description"]').attr('content') || "No content available.";
        const newsDate = $('meta[itemprop="datePublished"]').attr('content');
        let newsImage = $('meta[property="og:image"]').attr('content') || null;

        if (!newsTitle || !newsContent || !newsDate) {
            console.log(`⚠️ Skipping invalid news URL: ${newsUrl}`);
            return;
        }

        const today = new Date().toISOString().split('T')[0];
        const newsDateFormatted = new Date(newsDate).toISOString().split('T')[0];

        if (newsDateFormatted !== today) {
            console.log(`⚠️ Skipping old news URL: ${newsUrl}`);
            return;
        }

        sentNews.add(newsUrl);
        fs.appendFileSync(newsFile, `${newsUrl}\n`);

        const embed = new EmbedBuilder()
            .setTitle(`📰 ${newsTitle}`)
            .setDescription(`${newsContent}\n\n[Read More 📕](${newsUrl})`)
            .setColor('#ff1100')
            .setTimestamp()
            .setFooter({ text: 'Helakuru Esana News • Stay informed! | Powered By ImRishmika' });
        if (newsImage) embed.setImage(newsImage);

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setLabel('Read Full Article 📖')
                .setStyle(ButtonStyle.Link)
                .setURL(newsUrl)
        );

        if (sendToAll) {
            await sendNewsToChannelsAndUsers(embed, row);
        } else {
            return { embeds: [embed], components: [row] };
        }
    } catch (newsError) {
        console.log(`⚠️ Error fetching news URL ${newsUrl}:`, newsError.message);
    }
}

async function sendNewsToChannelsAndUsers(embed, row) {
    console.log('🚀 Sending news update to all channels and users.');
    const sendPromises = [];

    for (const guildId in serverChannels) {
        sendPromises.push(sendToChannel(guildId, embed, row));
    }

    for (const userId in userNotifications) {
        sendPromises.push(sendToUser(userId, embed, row));
    }

    await Promise.all(sendPromises);

    const owner = await client.users.fetch(OWNER_ID);
    owner.send('🚀 News update sent to all channels and users.');
}

async function sendToChannel(guildId, embed, row) {
    try {
        const channel = await client.channels.fetch(serverChannels[guildId]);
        if (channel) await channel.send({ embeds: [embed], components: [row] });
    } catch (error) {
        console.error(`⚠️ Error sending news to guild ${guildId}:`, error);
    }
}

async function sendToUser(userId, embed, row) {
    try {
        const user = await client.users.fetch(userId);
        if (user) await user.send({ embeds: [embed], components: [row] });
    } catch (error) {
        console.error(`⚠️ Error sending news to user ${userId}:`, error);
    }
}




// Helper Functions
function readJsonFileSync(filePath) {
    try {
        return fs.existsSync(filePath) ? JSON.parse(fs.readFileSync(filePath, 'utf8')) : {};
    } catch (error) {
        console.error(`Error reading ${filePath}:`, error);
        return {};
    }
}

// Helper Functions
function readJsonFileSync(filePath) {
    try {
        return fs.existsSync(filePath) ? JSON.parse(fs.readFileSync(filePath, 'utf8')) : {};
    } catch (error) {
        console.error(`Error reading ${filePath}:`, error);
        return {};
    }
}




client.on('interactionCreate', async (interaction) => {
    if (!interaction.isCommand()) return;

    const { commandName } = interaction;

    try {
        if (commandName === 'setnews') {
            if (interaction.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
                serverChannels[interaction.guildId] = interaction.channel.id;
                saveData(serverChannelsFile, serverChannels);
                interaction.reply('✅ This channel is now set for Helakuru Esana news updates!');
            } else {
                interaction.reply('⚠️ Only administrators can set the news channel!');
            }
        } else if (commandName === 'removenews') {
            if (interaction.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
                delete serverChannels[interaction.guildId];
                saveData(serverChannelsFile, serverChannels);
                interaction.reply('🚫 This channel will no longer receive news updates.');
            } else {
                interaction.reply('⚠️ Only administrators can remove the news channel!');
            }
        } else if (commandName === 'newsnotify') {
            const row = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId('news_notify_on').setLabel('Enable Notifications 🔔').setStyle(ButtonStyle.Success),
                new ButtonBuilder().setCustomId('news_notify_off').setLabel('Disable Notifications 🔕').setStyle(ButtonStyle.Danger)
            );
            interaction.reply({
                content: '🔔 Manage your news notification preferences:',
                components: [row],
            });
        } else if (commandName === 'newsstatus') {
            const statusEmbed = new EmbedBuilder()
                .setTitle('📊 News Bot Status')
                .setColor('#ff1100')
                .addFields(
                    { name: 'Registered Channels', value: Object.keys(serverChannels).length > 0 ? Object.values(serverChannels).join(', ') : 'None' },
                    { name: 'Users Receiving DMs', value: Object.keys(userNotifications).length > 0 ? Object.keys(userNotifications).join(', ') : 'None' }
                );
            interaction.reply({ embeds: [statusEmbed] });
        } else if (commandName === 'ping') {
            interaction.reply(`🏓 Pong! Bot latency: ${Date.now() - interaction.createdTimestamp}ms.`);
        } else if (commandName === 'help') {
            const helpEmbed = new EmbedBuilder()
                .setTitle('📢 Helakuru Esana News Bot Commands')
                .setColor('#ff1100')
                .setDescription('Stay informed with real-time updates from Helakuru Esana!')
                .addFields(
                    { name: '/setnews', value: 'Set this channel to receive news updates (admin only).' },
                    { name: '/removenews', value: 'Unsubscribe this channel from news updates (admin only).' },
                    { name: '/newsnotify', value: 'Enable or disable direct message notifications for yourself.' },
                    { name: '/newsstatus', value: 'Show the current configuration of news updates.' },
                    { name: '/ping', value: 'Check the bot latency.' },
                    { name: '/help', value: 'Show this help message with all commands.' },
                    { name: '/news', value: 'Fetch the latest news manually.' },
                    { name: '/invite', value: 'Get the invite link to add the bot to your server.' },
                    { name: '!christmas', value: '🎄 **Christmas Update** 🎅' },
                    { name: '!relese', value: '🎄 **Christmas Update Relese Notes** 🎅' },
                    { name: '/status', value: 'Get the Full Status of The Bot ( Owner Only )' }
                );
            interaction.reply({ embeds: [helpEmbed] });
        } else if (commandName === 'news') {
            const latestNews = await fetchLatestNews(true); // Now sends to all users
            if (latestNews) interaction.reply(latestNews);
            else interaction.reply('⚠️ No new news updates available at the moment.');
        } else if (commandName === 'invite') {
            const inviteEmbed = new EmbedBuilder()
                .setTitle('✨ Invite Helakuru Esana News Bot')
                .setColor('#ff1100')
                .setDescription('Add the bot to your server and stay updated with Helakuru Esana news!')
                .setURL('https://discord.com/api/oauth2/authorize?client_id=1306259513090769027&permissions=8&scope=bot');
            interaction.reply({ embeds: [inviteEmbed] });
        } else if (commandName === 'vote') {
            const inviteEmbed = new EmbedBuilder()
                .setTitle('📚 Vote Me')
                .setColor('#ff1100')
                .setDescription('Vote For Get More Updates And News')
                .setURL('https://top.gg/bot/1306259513090769027/vote');
            interaction.reply({ embeds: [inviteEmbed] });
        } else if (commandName === 'controlpanel') {
            if (interaction.user.id === OWNER_ID) {
                const controlPanelEmbed = new EmbedBuilder()
                    .setTitle('⚙️ Control Panel')
                    .setDescription('Manage the bot\'s status and activity.')
                    .setColor('#ff1100');

                const row = new ActionRowBuilder().addComponents(
                    new ButtonBuilder()
                        .setCustomId('set_online')
                        .setLabel('Online')
                        .setStyle(ButtonStyle.Success),
                    new ButtonBuilder()
                        .setCustomId('set_idle')
                        .setLabel('Idle')
                        .setStyle(ButtonStyle.Primary),
                    new ButtonBuilder()
                        .setCustomId('set_dnd')
                        .setLabel('Do Not Disturb')
                        .setStyle(ButtonStyle.Danger),
                    new ButtonBuilder()
                        .setCustomId('show_status')
                        .setLabel('Show Status')
                        .setStyle(ButtonStyle.Secondary)
                );

                interaction.reply({ embeds: [controlPanelEmbed], components: [row] });
            } else {
                interaction.reply('❌ Only the bot owner can use this command.');
            }
        }
    } catch (error) {
        console.error(`Error handling command ${commandName}:`, error);
        interaction.reply('❌ An error occurred while processing your command.');
    }
});



// Button Handling
client.on('interactionCreate', async (buttonInteraction) => {
    if (!buttonInteraction.isButton()) return;

    const userId = buttonInteraction.user.id;

    if (buttonInteraction.customId === 'news_notify_on') {
        userNotifications[userId] = true;
        saveData(userNotificationsFile, userNotifications);
        await buttonInteraction.reply('🔔 Notifications enabled! You will now receive news updates via DM.');
    } else if (buttonInteraction.customId === 'news_notify_off') {
        delete userNotifications[userId];
        saveData(userNotificationsFile, userNotifications);
        await buttonInteraction.reply('🔕 Notifications disabled! You will no longer receive news updates via DM.');
    }  else if (buttonInteraction.customId === 'set_online' && userId === OWNER_ID) {
        client.user.setStatus('online');
        await buttonInteraction.reply('✅ Bot status set to **Online**.');
    } else if (buttonInteraction.customId === 'set_idle' && userId === OWNER_ID) {
        client.user.setStatus('idle');
        await buttonInteraction.reply('⚠️ Bot status set to **Idle**.');
    } else if (buttonInteraction.customId === 'set_dnd' && userId === OWNER_ID) {
        client.user.setStatus('dnd');
        await buttonInteraction.reply('⛔ Bot status set to **Do Not Disturb**.');
    } else if (buttonInteraction.customId === 'show_status' && userId === OWNER_ID) {
        const status = client.user.presence?.status || 'unknown';
        await buttonInteraction.reply(`📊 Current bot status: **${status}**.`);
    } else {
        await buttonInteraction.reply({ content: '❌ You are not authorized to use this action.', ephemeral: true });
    }
});

// Rate Limitation

// Handle rate limits
client.on('rateLimit', (info) => {
    console.warn('⚠️ Bot is being rate-limited:', info);

    // Implement a backoff strategy
    const retryAfter = info.timeout || 5000; // Default to 5 seconds if not specified
    console.log(`⏳ Waiting ${retryAfter / 1000} seconds before retrying...`);
    
    setTimeout(() => {
        console.log('🔄 Retrying after rate limit...');
    }, retryAfter);
});

// Handle invalid token or connection issues
client.on('error', (error) => {
    if (error.message.includes('Invalid token')) {
        console.error('❌ Invalid token detected. The bot will not restart.');
        // Optionally notify the bot owner
        client.users.fetch(OWNER_ID).then((owner) => {
            owner.send('❌ The bot token is invalid. Please check and update the token.');
        });
    } else {
        console.error('⚠️ An error occurred:', error);
    }
});

// Prevent bot from crashing on unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
    console.error('🚨 Unhandled Promise Rejection at:', promise, 'reason:', reason);
    // Keep the bot running
});

// Prevent bot from exiting on other uncaught exceptions
process.on('uncaughtException', (error) => {
    console.error('🚨 Uncaught Exception:', error);
    // Optionally notify the owner or log to an external service
    client.users.fetch(OWNER_ID).then((owner) => {
        owner.send('🚨 An uncaught exception occurred. The bot is still running.');
    });
});



const adsFile = './ads.json';
let adsData = readJsonFileSync(adsFile);
if (!adsData.ads) {
    adsData = { ads: [], currentIndex: 0, interval: null, paused: false };
}

// Helper Functions
function readJsonFileSync(filePath) {
    try {
        return fs.existsSync(filePath) ? JSON.parse(fs.readFileSync(filePath, 'utf8')) : {};
    } catch (error) {
        console.error(`Error reading ${filePath}:`, error);
        return {};
    }
}

function saveData(filePath, data) {
    try {
        fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
    } catch (error) {
        console.error(`Error saving to ${filePath}:`, error);
    }
}

// Ad Management Commands
client.on('messageCreate', async (message) => {
    if (!message.content.startsWith('!') || message.author.bot) return;

    const args = message.content.slice(1).trim().split(/ +/);
    const command = args.shift().toLowerCase();

    try {
        if (command === 'addad') {
            const adText = args.join(' ');
            if (!adText) {
                return message.reply('⚠️ Please provide the ad text.');
            }
            adsData.ads.push(adText);
            saveData(adsFile, adsData);
            message.reply('✅ Ad added successfully!');
        } else if (command === 'listads') {
            if (adsData.ads.length === 0) {
                return message.reply('⚠️ No ads available.');
            }
            const adList = adsData.ads.map((ad, index) => `${index + 1}. ${ad}`).join('\n');
            message.reply(`📋 **Ad List:**\n${adList}`);
        } else if (command === 'removead') {
            const index = parseInt(args[0], 10) - 1;
            if (isNaN(index) || index < 0 || index >= adsData.ads.length) {
                return message.reply('⚠️ Invalid ad index.');
            }
            adsData.ads.splice(index, 1);
            saveData(adsFile, adsData);
            message.reply('✅ Ad removed successfully!');
        } else if (command === 'editad') {
            const index = parseInt(args[0], 10) - 1;
            const newText = args.slice(1).join(' ');
            if (isNaN(index) || index < 0 || index >= adsData.ads.length || !newText) {
                return message.reply('⚠️ Invalid ad index or text.');
            }
            adsData.ads[index] = newText;
            saveData(adsFile, adsData);
            message.reply('✅ Ad edited successfully!');
        } else if (command === 'clearads') {
            adsData.ads = [];
            adsData.currentIndex = 0;
            saveData(adsFile, adsData);
            message.reply('✅ All ads cleared successfully!');
        } else if (command === 'previewad') {
            if (adsData.ads.length === 0) {
                return message.reply('⚠️ No ads available.');
            }
            const ad = adsData.ads[adsData.currentIndex];
            message.reply(`📢 **Next Ad Preview:**\n${ad}`);
        } else if (command === 'setinterval') {
            const interval = parseInt(args[0], 10);
            if (isNaN(interval) || interval <= 0) {
                return message.reply('⚠️ Invalid interval.');
            }
            adsData.interval = interval;
            saveData(adsFile, adsData);
            message.reply(`✅ Ad interval set to ${interval} minutes.`);
            startAdInterval();
        } else if (command === 'pauseads') {
            adsData.paused = true;
            saveData(adsFile, adsData);
            message.reply('⏸️ Ad broadcasting paused.');
        } else if (command === 'resumeads') {
            adsData.paused = false;
            saveData(adsFile, adsData);
            message.reply('▶️ Ad broadcasting resumed.');
        } else if (command === 'adstats') {
            const stats = `📊 **Ad Statistics:**\nTotal Ads: ${adsData.ads.length}\nCurrent Index: ${adsData.currentIndex + 1}\nInterval: ${adsData.interval || 'Not Set'} minutes\nPaused: ${adsData.paused ? 'Yes' : 'No'}`;
            message.reply(stats);
        } else if (command === 'ads') {
            if (adsData.ads.length === 0) {
                return message.reply('⚠️ No ads available.');
            }
            const ad = adsData.ads[adsData.currentIndex];
            adsData.currentIndex = (adsData.currentIndex + 1) % adsData.ads.length;
            saveData(adsFile, adsData);

            const embed = new EmbedBuilder()
                .setTitle('📢 Advertisement')
                .setDescription(ad)
                .setColor('#ff1100')
                .setTimestamp();

            await sendAdToChannelsAndUsers(embed);
            message.reply('🚀 Ad broadcasted successfully!');
        }
    } catch (error) {
        console.error(`Error handling command ${command}:`, error);
        message.reply('❌ An error occurred while processing your command.');
    }
});

async function sendAdToChannelsAndUsers(embed) {
    console.log('🚀 Sending ad to all channels and users.');
    for (const guildId in serverChannels) {
        try {
            const channel = await client.channels.fetch(serverChannels[guildId]);
            if (channel) await channel.send({ embeds: [embed] });
        } catch (error) {
            console.error(`⚠️ Error sending ad to guild ${guildId}:`, error);
        }
    }

    for (const userId in userNotifications) {
        try {
            const user = await client.users.fetch(userId);
            if (user) await user.send({ embeds: [embed] });
        } catch (error) {
            console.error(`⚠️ Error sending ad to user ${userId}:`, error);
        }
    }

    try {
        const owner = await client.users.fetch(OWNER_ID);
        owner.send('🚀 Ad broadcasted to all channels and users.');
    } catch (error) {
        console.error(`⚠️ Error sending ad to owner:`, error);
    }
}

function startAdInterval() {
    if (adsData.interval && !adsData.paused) {
        setInterval(async () => {
            if (!adsData.paused && adsData.ads.length > 0) {
                const ad = adsData.ads[adsData.currentIndex];
                adsData.currentIndex = (adsData.currentIndex + 1) % adsData.ads.length;
                saveData(adsFile, adsData);

                const embed = new EmbedBuilder()
                    .setTitle('📢 Advertisement')
                    .setDescription(ad)
                    .setColor('#ff1100')
                    .setTimestamp();

                await sendAdToChannelsAndUsers(embed);
            }
        }, adsData.interval * 60000);
    }
}

// Start the ad interval if it's set
startAdInterval();



// Christmas Game

client.on('messageCreate', async (message) => {
    try {
        // Ignore messages from bots
        if (message.author.bot) return;

        // Check if the message starts with "!game"
        if (message.content.startsWith('!game')) {
            // Create the game embed
            const gameEmbed = new EmbedBuilder()
                .setTitle('🎄 Guess the Gift 🎁')
                .setDescription('Guess which gift contains the special surprise! Click a button to make your guess.')
                .setColor('#ff1100');

            // Create buttons for the gifts
            const row = new MessageActionRow()
                .addComponents(
                    new MessageButton().setCustomId('gift1').setLabel('🎁 Gift 1').setStyle('PRIMARY'),
                    new MessageButton().setCustomId('gift2').setLabel('🎁 Gift 2').setStyle('PRIMARY'),
                    new MessageButton().setCustomId('gift3').setLabel('🎁 Gift 3').setStyle('PRIMARY')
                );

            // Send the embed and buttons to the channel
            await message.channel.send({ embeds: [gameEmbed], components: [row] });
        }
    } catch (error) {
        console.error('Error handling message:', error);
        await message.channel.send({ content: 'Something went wrong! Please try again later.' });
    }
});

// Handle interaction events (buttons)
client.on('interactionCreate', async (interaction) => {
    try {
        if (interaction.isButton()) {
            // Responses for each button press
            const gifts = ['🎉 You found the special surprise!', '🎁 Try again!', '🎁 Try again!'];
            const randomGift = gifts[Math.floor(Math.random() * gifts.length)];

            // Update the message with the result and remove the buttons
            await interaction.update({ content: randomGift, components: [] });
        }
    } catch (error) {
        console.error('Error handling interaction:', error);
        await interaction.reply({ content: 'Something went wrong! Please try again later.', ephemeral: true });
    }
});

// Respond to `!christmas` and `!release` commands in messageCreate
client.on('messageCreate', async (message) => {
    try {
        // Ignore messages from bots
        if (message.author.bot) return;

        // Check if the message starts with `!`
        if (message.content.startsWith('!')) {
            // Check for specific commands
            if (message.content === '!christmas') {
                const christmasEmbed = new EmbedBuilder()
                    .setTitle('🎄 Christmas Features 🎅')
                    .setDescription('Explore all the Christmas-related features!')
                    .setColor('#ff1100')
                    .addFields(
                        { name: '🎁 Christmas Game', value: 'Use `!game` to play the "Guess the Gift" game.' },
                        { name: '🎅 Automatic Christmas Greeting', value: 'Receive a personalized Merry Christmas message on December 25th!' }
                    );

                await message.channel.send({ embeds: [christmasEmbed] });
            }

            if (message.content === '!release') {
                const releaseEmbed = new EmbedBuilder()
                    .setTitle('🎄 Christmas Update 🎅')
                    .setDescription('We are excited to announce our new Christmas features!')
                    .setColor('#ff1100')
                    .addFields(
                        { name: '🎁 Christmas Game', value: 'Play the "Guess the Gift" game and find the special surprise!' },
                        { name: '🎅 Automatic Christmas Greeting', value: 'Receive a personalized Merry Christmas message on December 25th!' }
                    )
                    .setFooter({ text: 'Helakuru News Bot V1.6 Alpha Christmas Update 🎅🎄' });

                await message.channel.send({ embeds: [releaseEmbed] });
            }
        }
    } catch (error) {
        console.error('Error handling message:', error);
        await message.reply({ content: 'Something went wrong! Please try again later.', ephemeral: true });
    }
});

// Automatic Christmas Greeting
client.on('ready', () => {
    try {
        const now = new Date();
        const christmasDate = new Date(now.getFullYear(), 11, 25); // December 25th

        if (now.getMonth() === 11 && now.getDate() === 25) {
            sendChristmasGreeting();
        } else {
            const timeUntilChristmas = christmasDate - now;
            setTimeout(sendChristmasGreeting, timeUntilChristmas);
        }
    } catch (error) {
        console.error('Error calculating Christmas date:', error);
    }
});

async function sendChristmasGreeting() {
    try {
        const greetingEmbed = new EmbedBuilder()
            .setTitle('🎄 Merry Christmas! 🎅')
            .setDescription('Wishing you a Merry Christmas and a Happy New Year! 🎁✨')
            .setColor('#ff1100')
            .setImage('https://example.com/christmas-image.gif'); // Replace with your festive media URL

        // Assuming userNotifications is a dictionary with user IDs
        for (const userId in userNotifications) {
            try {
                const user = await client.users.fetch(userId);
                if (user) await user.send({ embeds: [greetingEmbed] });
            } catch (error) {
                console.error(`⚠️ Error sending Christmas greeting to user ${userId}:`, error);
            }
        }
    } catch (error) {
        console.error('Error sending Christmas greeting:', error);
    }
}



// Cron Job
cron.schedule('*/5 * * * *', fetchLatestNews);

client.login(BOT_TOKEN);
