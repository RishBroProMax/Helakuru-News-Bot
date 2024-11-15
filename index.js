const {
    Client,
    GatewayIntentBits,
    EmbedBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
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
const OWNER_ID = process.env.OWNER_ID;
const newsFile = './news.txt';
const serverChannelsFile = './serverChannels.json';
const userNotificationsFile = './userNotifications.json';

client.commands = new Collection();
const sentNews = new Set(fs.existsSync(newsFile) ? fs.readFileSync(newsFile, 'utf8').split('\n') : []);
const serverChannels = readJsonFileSync(serverChannelsFile);
const userNotifications = readJsonFileSync(userNotificationsFile);
let lastNewsId = 106250;

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
    ].map(command => command.toJSON());

    await client.application.commands.set(commands);
});

// Fetch News and Send to Channels/Users
async function fetchLatestNews(sendToAll = true) {
    console.log('🔍 Fetching the latest news...');
    try {
        for (let newsId = lastNewsId + 1; newsId <= lastNewsId + 10; newsId++) {
            if (sentNews.has(newsId.toString())) continue;

            const newsUrl = `https://www.helakuru.lk/esana/news/${newsId}`;
            try {
                const { data } = await axios.get(newsUrl);
                const $ = cheerio.load(data);
                const newsTitle = $('meta[property="og:title"]').attr('content') || "Untitled News";
                const newsContent = $('meta[property="og:description"]').attr('content') || "No content available.";
                let newsImage = $('meta[property="og:image"]').attr('content') || null;

                if (!newsTitle || !newsContent) {
                    console.log(`⚠️ Skipping invalid news ID: ${newsId}`);
                    continue;
                }

                lastNewsId = newsId;
                sentNews.add(newsId.toString());
                fs.appendFileSync(newsFile, `${newsId}\n`);

                const embed = new EmbedBuilder()
                    .setTitle(`📰 ${newsTitle}`)
                    .setDescription(`${newsContent}\n\n[Read More 📕](${newsUrl})`)
                    .setColor('#ff1100')
                    .setTimestamp()
                    .setFooter({ text: 'Helakuru Esana News • Stay informed! | Powerd By ImRishmika' });
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
                console.log(`⚠️ Error fetching news ID ${newsId}:`, newsError.message);
            }
        }
    } catch (error) {
        console.error('❌ General error fetching news:', error);
    }
}

async function sendNewsToChannelsAndUsers(embed, row) {
    console.log('🚀 Sending news update to all channels and users.');
    for (const guildId in serverChannels) {
        try {
            const channel = await client.channels.fetch(serverChannels[guildId]);
            if (channel) await channel.send({ embeds: [embed], components: [row] });
        } catch (error) {
            console.error(`⚠️ Error sending news to guild ${guildId}:`, error);
        }
    }

    for (const userId in userNotifications) {
        try {
            const user = await client.users.fetch(userId);
            if (user) await user.send({ embeds: [embed], components: [row] });
        } catch (error) {
            console.error(`⚠️ Error sending news to user ${userId}:`, error);
        }
    }

    const owner = await client.users.fetch(OWNER_ID);
    owner.send('🚀 News update sent to all channels and users.');
}

// Interaction and Command Handling
client.on('interactionCreate', async (interaction) => {
    if (!interaction.isCommand()) return;

    const { commandName } = interaction;
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
                { name: '/invite', value: 'Get the invite link to add the bot to your server.' }
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
            .setURL('https://discord.com/api/oauth2/authorize?client_id=CLIENT_ID&permissions=8&scope=bot');
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
    } else if (buttonInteraction.customId === 'set_online' && userId === OWNER_ID) {
        await client.user.setStatus('online');
        await buttonInteraction.reply('✅ Bot status set to **Online**.');
    } else if (buttonInteraction.customId === 'set_idle' && userId === OWNER_ID) {
        await client.user.setStatus('idle');
        await buttonInteraction.reply('✅ Bot status set to **Idle**.');
    } else if (buttonInteraction.customId === 'set_dnd' && userId === OWNER_ID) {
        await client.user.setStatus('dnd');
        await buttonInteraction.reply('✅ Bot status set to **Do Not Disturb**.');
    } else if (buttonInteraction.customId === 'show_status' && userId === OWNER_ID) {
        const status = client.user.presence.status;
        await buttonInteraction.reply(`📊 Current bot status: **${status.toUpperCase()}**`);
    }
});

// Cron Job
cron.schedule('*/10 * * * *', fetchLatestNews);

client.login(BOT_TOKEN);
