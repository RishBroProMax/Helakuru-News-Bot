const { Client, GatewayIntentBits, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, PermissionsBitField, SlashCommandBuilder } = require('discord.js');
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

function readJsonFileSync(filePath) {
    try {
        if (fs.existsSync(filePath)) {
            const data = fs.readFileSync(filePath, 'utf8');
            return data ? JSON.parse(data) : {};
        } else {
            return {};
        }
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

const sentNews = new Set(fs.existsSync(newsFile) ? fs.readFileSync(newsFile, 'utf8').split('\n') : []);
const serverChannels = readJsonFileSync(serverChannelsFile);
const userNotifications = readJsonFileSync(userNotificationsFile);
let lastNewsId = 106210;

client.once('ready', async () => {
    console.log(`✅ ${client.user.tag} is online and ready to send Helakuru Esana News 📰`);
    client.user.setActivity('Helakuru Esana News 📰', { type: 'WATCHING' });

    const owner = await client.users.fetch(OWNER_ID);
    await owner.send(`✅ ${client.user.tag} is online and monitoring Helakuru Esana news.`);
});

async function fetchLatestNews(sendToAll = true) {
    console.log('🔍 Fetching the latest news...');
    try {
        for (let newsId = lastNewsId + 1; newsId <= lastNewsId + 10; newsId++) {
            if (sentNews.has(newsId.toString())) continue;

            const newsUrl = `https://www.helakuru.lk/esana/news/${newsId}`;
            const { data } = await axios.get(newsUrl);
            const $ = cheerio.load(data);

            const newsTitle = $('meta[property="og:title"]').attr('content') || "Untitled News";
            const newsContent = $('meta[property="og:description"]').attr('content') || "No content available.";
            let newsImage = $('meta[property="og:image"]').attr('content') || "";

            // Automatically remove thumbnail if it fails to load
            if (!newsImage) {
                console.log('⚠️ No valid thumbnail found. Removing thumbnail.');
                newsImage = null;
            }

            if (newsTitle && newsContent) {
                lastNewsId = newsId;
                sentNews.add(newsId.toString());
                fs.appendFileSync(newsFile, `${newsId}\n`);

                const embed = new EmbedBuilder()
                    .setTitle(`📰 ${newsTitle}`)
                    .setDescription(`${newsContent}\n\n[Read More 📕](${newsUrl})`)
                    .setColor('#00bfff')
                    .setTimestamp()
                    .setFooter({ text: 'Helakuru Esana News • Stay informed!' });
                
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
            }
        }
    } catch (error) {
        console.error('❌ Error fetching news:', error);
    }
}

async function sendNewsToChannelsAndUsers(embed, row) {
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
        const option = interaction.options.getString('option');
        if (option === 'on') {
            userNotifications[interaction.user.id] = true;
            saveData(userNotificationsFile, userNotifications);
            interaction.reply('🔔 You will now receive news updates via DM!');
        } else if (option === 'off') {
            delete userNotifications[interaction.user.id];
            saveData(userNotificationsFile, userNotifications);
            interaction.reply('🔕 You have turned off news updates in DMs.');
        } else {
            interaction.reply('⚠️ Invalid option! Use "on" or "off".');
        }
    } else if (commandName === 'newsstatus') {
        const statusEmbed = new EmbedBuilder()
            .setTitle('📊 News Bot Status')
            .setColor('#00bfff')
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
            .setColor('#0099ff')
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
        const latestNews = await fetchLatestNews(false);
        if (latestNews) interaction.reply(latestNews);
        else interaction.reply('⚠️ No new news updates available at the moment. All Latest News Are Sended');
    } else if (commandName === 'console' && interaction.user.id === OWNER_ID) {
        const consoleLines = fs.readFileSync('./console.log', 'utf8').split('\n').slice(-50).join('\n');
        interaction.reply(`\`\`\`${consoleLines}\`\`\``);
    } else if (commandName === 'invite') {
        const inviteLink = 'https://discord.com/oauth2/authorize?client_id=1306259513090769027&permissions=277025392704&integration_type=0&scope=bot';
        interaction.reply(`✅ [Click here to invite the bot to your server!](${inviteLink})`);
    }
});

// Auto-clean up and register only active slash commands globally
client.once('ready', async () => {
    const commands = [
        new SlashCommandBuilder().setName('setnews').setDescription('🚧 Set this channel to receive news updates'),
        new SlashCommandBuilder().setName('removenews').setDescription('💥 Remove news updates from this channel'),
        new SlashCommandBuilder().setName('newsnotify').setDescription('🔔 Enable or disable direct message notifications'),
        new SlashCommandBuilder().setName('newsstatus').setDescription('📡 Show current bot configuration and news update status'),
        new SlashCommandBuilder().setName('ping').setDescription('🎊 Check bot latency'),
        new SlashCommandBuilder().setName('help').setDescription('🆘 Show help information for all commands'),
        new SlashCommandBuilder().setName('news').setDescription('🔰 Fetch the latest news manually'),
        new SlashCommandBuilder().setName('invite').setDescription('✔ Get the bot invite link')
    ];
    await client.application.commands.set(commands);
    console.log('✅ Slash commands registered globally.');
});

client.on('messageCreate', async (message) => {
    if (message.channel.type === 'DM' && !message.author.bot && !userNotifications[message.author.id]) {
        userNotifications[message.author.id] = true;

        const embed = new EmbedBuilder()
            .setTitle('👋 Welcome to Helakuru Esana News Bot!')
            .setDescription('Get real-time news updates right here on Discord! Click below for more options. Use /help')
            .setColor('#00bfff')
            .setFooter({ text: '🎉Thank you for subscribing!' });

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setLabel('Help')
                .setStyle(ButtonStyle.Primary)
                .setCustomId('help')
        );

        await message.author.send({ embeds: [embed], components: [row] });
    }
});

client.login(BOT_TOKEN);
