
require("dotenv").config();

const http = require("http");
const fs = require("fs");
const path = require("path");

const {
    Client,
    GatewayIntentBits,
    EmbedBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    UserSelectMenuBuilder,
    ModalBuilder,
    TextInputBuilder,
    TextInputStyle,
    MessageFlags,
    AttachmentBuilder,
    Events,
    ChannelType
} = require("discord.js");

// ==========================================
// HTTP SERVER สำหรับ Render Web Service
// ==========================================

const PORT = process.env.PORT || 10000;

const server = http.createServer((req, res) => {
    res.writeHead(200, {
        "Content-Type": "text/plain; charset=utf-8"
    });

    res.end("ZONE Whisper is running!");
});

server.listen(PORT, "0.0.0.0", () => {
    console.log(`🌐 Web Server running on port ${PORT}`);
});
require("dotenv").config();

const fs = require("fs");
const path = require("path");

const {
    Client,
    GatewayIntentBits,
    Events,
    EmbedBuilder,
    ActionRowBuilder,
    UserSelectMenuBuilder,
    ButtonBuilder,
    ButtonStyle,
    ModalBuilder,
    TextInputBuilder,
    TextInputStyle,
    ChannelType,
    MessageFlags,
    AttachmentBuilder,
    PermissionsBitField
} = require("discord.js");

// ==========================================
// CONFIG
// ==========================================

const TOKEN = process.env.TOKEN;
const CONFESSION_CHANNEL_ID = process.env.CONFESSION_CHANNEL_ID;

if (!TOKEN || !CONFESSION_CHANNEL_ID) {
    console.error("❌ กรุณาตรวจสอบ TOKEN และ CONFESSION_CHANNEL_ID ใน .env");
    process.exit(1);
}

// อิโมจิโทรโข่งจากลิงก์ล่าสุด
const MEGAPHONE = "<:_:1567833906525507817>";

// อิโมจิปุ่มตอบกลับ
const REPLY_EMOJI = {
    id: "1564211441190305844",
    name: "reply"
};

const BANNER_PATH = path.join(__dirname, "messages.png");

const DATA_DIR = path.join(__dirname, "data");
const DATA_FILE = path.join(DATA_DIR, "messages.json");

// ==========================================
// DATABASE
// ==========================================

if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
}

if (!fs.existsSync(DATA_FILE)) {
    fs.writeFileSync(DATA_FILE, "{}", "utf8");
}

function readDatabase() {
    try {
        const data = JSON.parse(
            fs.readFileSync(DATA_FILE, "utf8")
        );

        if (
            data &&
            typeof data === "object" &&
            !Array.isArray(data)
        ) {
            return data;
        }

        return {};
    } catch (error) {
        console.error("❌ อ่านฐานข้อมูลไม่สำเร็จ:", error);
        return {};
    }
}

function writeDatabase(data) {
    const tempFile = DATA_FILE + ".tmp";

    fs.writeFileSync(
        tempFile,
        JSON.stringify(data, null, 2),
        "utf8"
    );

    fs.renameSync(tempFile, DATA_FILE);
}

// ==========================================
// DISCORD CLIENT
// ==========================================

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds
    ]
});

// ==========================================
// HELPER FUNCTIONS
// ==========================================

function createId() {
    return (
        Date.now().toString(36) +
        Math.random().toString(36).slice(2, 10)
    );
}

function makeBox(text) {
    const safeText = String(text || "ไม่มี")
        .replace(/```/g, "ˋˋˋ")
        .trim();

    const result = "```\n" + safeText + "\n```";

    if (result.length > 1024) {
        return "```\n" + safeText.slice(0, 990) + "...\n```";
    }

    return result;
}

// ==========================================
// USER SELECT MENU
// ==========================================

function createUserSelect() {
    return new UserSelectMenuBuilder()
        .setCustomId("whisper_select_user")
        .setPlaceholder("📩 | เลือกคนที่คุณต้องการฝากบอก")
        .setMinValues(1)
        .setMaxValues(1);
}

function createPanelComponents() {
    return [
        new ActionRowBuilder().addComponents(
            createUserSelect()
        )
    ];
}

// ==========================================
// RESET PANEL MENU
// ==========================================

async function resetPanelMenu(message) {
    if (!message) return;

    try {
        await message.edit({
            components: createPanelComponents()
        });

        console.log("✅ รีเซ็ตเมนู Whisper เรียบร้อย");
    } catch (error) {
        console.error(
            "❌ รีเซ็ตเมนูไม่สำเร็จ:",
            error.message
        );
    }
}

// ==========================================
// REPLY BUTTON
// ==========================================

function createReplyButton(requestId, disabled = false) {
    const button = new ButtonBuilder()
        .setCustomId(`whisper_reply_${requestId}`)
        .setStyle(ButtonStyle.Secondary)
        .setDisabled(disabled)
        .setEmoji(REPLY_EMOJI);

    if (disabled) {
        button.setLabel("ตอบกลับแล้ว");
    } else {
        button.setLabel("ตอบกลับ");
    }

    return new ActionRowBuilder().addComponents(button);
}

// ==========================================
// PANEL EMBED
// ==========================================

function createBannerEmbed() {
    return new EmbedBuilder()
        .setColor("#ed6ba8")
        .setImage("attachment://messages.png")
        .setDescription(
            [
                "💌  |  แอบมีอะไรอยู่ในใจ อยากบอกใคร ลองกระซิบดูสิ",
                "",
            ].join("\n")
        );
}

// ==========================================
// READY
// ==========================================

client.once(Events.ClientReady, (readyClient) => {
    console.log("================================");
    console.log(`✅ BOT ONLINE: ${readyClient.user.tag}`);
    console.log("💗 WHISPER SYSTEM ONLINE");
    console.log("📩 คำสั่ง: /whisper");
    console.log("================================");
});

// ==========================================
// INTERACTION CREATE
// ==========================================

client.on(Events.InteractionCreate, async (interaction) => {
    try {

        // ======================================
        // /whisper
        // ======================================

        if (
            interaction.isChatInputCommand() &&
            interaction.commandName === "whisper"
        ) {
            const channel = interaction.options.getChannel("channel");

            if (
                !channel ||
                channel.type !== ChannelType.GuildText
            ) {
                return interaction.reply({
                    content: "❌ กรุณาเลือกห้องข้อความที่ถูกต้อง",
                    flags: MessageFlags.Ephemeral
                });
            }

            const permissions = channel.permissionsFor(client.user);

            if (
                !permissions ||
                !permissions.has([
                    PermissionsBitField.Flags.ViewChannel,
                    PermissionsBitField.Flags.SendMessages,
                    PermissionsBitField.Flags.EmbedLinks,
                    PermissionsBitField.Flags.AttachFiles
                ])
            ) {
                return interaction.reply({
                    content: "❌ บอทไม่มีสิทธิ์ส่งข้อความหรือแนบรูปภาพในห้องนี้",
                    flags: MessageFlags.Ephemeral
                });
            }

            if (!fs.existsSync(BANNER_PATH)) {
                return interaction.reply({
                    content: "❌ ไม่พบไฟล์ messages.png กรุณาวางไฟล์ไว้ข้าง index.js",
                    flags: MessageFlags.Ephemeral
                });
            }

            await interaction.deferReply({
                flags: MessageFlags.Ephemeral
            });

            const bannerFile = new AttachmentBuilder(
                BANNER_PATH,
                {
                    name: "messages.png"
                }
            );

            await channel.send({
                embeds: [
                    createBannerEmbed()
                ],
                files: [
                    bannerFile
                ],
                components: createPanelComponents()
            });

            return interaction.deleteReply();
        }

        // ======================================
        // SELECT RECIPIENT
        // ======================================

        if (
            interaction.isUserSelectMenu() &&
            interaction.customId === "whisper_select_user"
        ) {
            const recipient = interaction.users.first();

            if (!recipient) {
                return interaction.reply({
                    content: "❌ ไม่พบผู้รับข้อความ",
                    flags: MessageFlags.Ephemeral
                });
            }

            if (recipient.bot) {
                return interaction.reply({
                    content: "❌ ไม่สามารถเลือกบอทได้",
                    flags: MessageFlags.Ephemeral
                });
            }

            if (recipient.id === interaction.user.id) {
                return interaction.reply({
                    content: "❌ ไม่สามารถเลือกตัวเองได้",
                    flags: MessageFlags.Ephemeral
                });
            }

            const modal = new ModalBuilder()
                .setCustomId(`whisper_message_modal_${recipient.id}`)
                .setTitle("💌 ฝากข้อความ");

            const messageInput = new TextInputBuilder()
                .setCustomId("message")
                .setLabel("ข้อความที่ต้องการฝาก")
                .setPlaceholder("พิมพ์ข้อความของคุณ...")
                .setStyle(TextInputStyle.Paragraph)
                .setMinLength(1)
                .setMaxLength(900)
                .setRequired(true);

            const hintInput = new TextInputBuilder()
                .setCustomId("hint")
                .setLabel("คำใบ้ถึงตัวคุณ (ไม่บังคับ)")
                .setPlaceholder("เช่น คนที่เจอกันทุกวัน")
                .setStyle(TextInputStyle.Short)
                .setMaxLength(100)
                .setRequired(false);

            modal.addComponents(
                new ActionRowBuilder().addComponents(messageInput),
                new ActionRowBuilder().addComponents(hintInput)
            );

            await interaction.showModal(modal);

            await resetPanelMenu(interaction.message);

            return;
        }

        // ======================================
        // SUBMIT ANONYMOUS MESSAGE
        // ======================================

        if (
            interaction.isModalSubmit() &&
            interaction.customId.startsWith("whisper_message_modal_")
        ) {
            await interaction.deferReply({
                flags: MessageFlags.Ephemeral
            });

            const recipientId = interaction.customId.replace(
                "whisper_message_modal_",
                ""
            );

            const messageText = interaction.fields.getTextInputValue(
                "message"
            );

            const hintText =
                interaction.fields.getTextInputValue("hint") || "ไม่มี";

            const recipient = await client.users.fetch(recipientId);

            if (
                recipient.bot ||
                recipient.id === interaction.user.id
            ) {
                return interaction.editReply({
                    content: "❌ ผู้รับไม่ถูกต้อง"
                });
            }

            const channel = await client.channels.fetch(
                CONFESSION_CHANNEL_ID
            );

            if (
                !channel ||
                !channel.isTextBased() ||
                !channel.messages
            ) {
                return interaction.editReply({
                    content: "❌ ไม่พบห้องฝากข้อความ กรุณาติดต่อผู้ดูแลระบบ"
                });
            }

            const requestId = createId();

            const embed = new EmbedBuilder()
                .setColor("#2b2d31")
                .addFields(
                    {
                        name: "ข้อความ",
                        value: makeBox(messageText),
                        inline: false
                    },
                    {
                        name: "คำใบ้",
                        value: makeBox(hintText.trim() || "ไม่มี"),
                        inline: false
                    }
                );

            const sentMessage = await channel.send({
                content:
                    `> มีข้อความฝากบอกถึงคุณ <@${recipientId}> ${MEGAPHONE}`,
                embeds: [
                    embed
                ],
                components: [
                    createReplyButton(requestId)
                ],
                allowedMentions: {
                    users: [
                        recipientId
                    ]
                }
            });

            const database = readDatabase();

            database[requestId] = {
                senderId: interaction.user.id,
                recipientId: recipientId,
                guildId: interaction.guildId,
                channelId: channel.id,
                messageId: sentMessage.id,
                messageText: messageText,
                hintText: hintText,
                replied: false,
                createdAt: Date.now()
            };

            writeDatabase(database);

            return interaction.editReply({
                content: "💗 ส่งข้อความของคุณเรียบร้อยแล้ว!"
            });
        }

        // ======================================
        // REPLY BUTTON
        // ======================================

        if (
            interaction.isButton() &&
            interaction.customId.startsWith("whisper_reply_")
        ) {
            const requestId = interaction.customId.replace(
                "whisper_reply_",
                ""
            );

            const database = readDatabase();
            const request = database[requestId];

            if (!request) {
                return interaction.reply({
                    content: "❌ ไม่พบข้อมูลข้อความนี้",
                    flags: MessageFlags.Ephemeral
                });
            }

            if (interaction.user.id !== request.recipientId) {
                return interaction.reply({
                    content: "❌ เฉพาะผู้รับข้อความเท่านั้นที่ตอบกลับได้",
                    flags: MessageFlags.Ephemeral
                });
            }

            if (request.replied) {
                return interaction.reply({
                    content: "❌ ข้อความนี้ได้รับการตอบกลับแล้ว",
                    flags: MessageFlags.Ephemeral
                });
            }

            const modal = new ModalBuilder()
                .setCustomId(`whisper_reply_modal_${requestId}`)
                .setTitle("💬 ตอบกลับข้อความ");

            const replyInput = new TextInputBuilder()
                .setCustomId("reply")
                .setLabel("ข้อความตอบกลับ")
                .setPlaceholder("พิมพ์ข้อความตอบกลับ...")
                .setStyle(TextInputStyle.Paragraph)
                .setMinLength(1)
                .setMaxLength(900)
                .setRequired(true);

            modal.addComponents(
                new ActionRowBuilder().addComponents(replyInput)
            );

            return interaction.showModal(modal);
        }

        // ======================================
        // SUBMIT REPLY
        // ======================================

        if (
            interaction.isModalSubmit() &&
            interaction.customId.startsWith("whisper_reply_modal_")
        ) {
            await interaction.deferReply({
                flags: MessageFlags.Ephemeral
            });

            const requestId = interaction.customId.replace(
                "whisper_reply_modal_",
                ""
            );

            const database = readDatabase();
            const request = database[requestId];

            if (!request) {
                return interaction.editReply({
                    content: "❌ ไม่พบข้อความนี้"
                });
            }

            if (interaction.user.id !== request.recipientId) {
                return interaction.editReply({
                    content: "❌ คุณไม่มีสิทธิ์ตอบกลับข้อความนี้"
                });
            }

            if (request.replied) {
                return interaction.editReply({
                    content: "❌ ข้อความนี้ได้รับการตอบกลับแล้ว"
                });
            }

            const replyText = interaction.fields.getTextInputValue(
                "reply"
            );

            const channel = await client.channels.fetch(
                request.channelId
            );

            if (
                !channel ||
                !channel.isTextBased() ||
                !channel.messages
            ) {
                return interaction.editReply({
                    content: "❌ ไม่พบห้องข้อความเดิม"
                });
            }

            const originalMessage = await channel.messages.fetch(
                request.messageId
            );

            if (!originalMessage.embeds.length) {
                return interaction.editReply({
                    content: "❌ ไม่พบ Embed ของข้อความต้นฉบับ"
                });
            }

            const updatedEmbed = EmbedBuilder.from(
                originalMessage.embeds[0]
            );

            updatedEmbed.addFields({
                name: "ข้อความตอบกลับ",
                value: makeBox(replyText),
                inline: false
            });

            await originalMessage.edit({
                embeds: [
                    updatedEmbed
                ],
                components: [
                    createReplyButton(requestId, true)
                ]
            });

            request.replied = true;
            request.repliedAt = Date.now();
            request.replyText = replyText;

            database[requestId] = request;

            writeDatabase(database);

            return interaction.deleteReply();
        }

    } catch (error) {
        console.error("❌ Interaction Error:", error);

        const errorMessage =
            "❌ เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง";

        if (interaction.deferred) {
            await interaction.editReply({
                content: errorMessage
            }).catch(() => {});
        } else if (interaction.replied) {
            await interaction.followUp({
                content: errorMessage,
                flags: MessageFlags.Ephemeral
            }).catch(() => {});
        } else {
            await interaction.reply({
                content: errorMessage,
                flags: MessageFlags.Ephemeral
            }).catch(() => {});
        }
    }
});

// ==========================================
// LOGIN
// ==========================================

client.login(TOKEN).catch((error) => {
    console.error("❌ ไม่สามารถเข้าสู่ระบบ Discord ได้:", error);
});
