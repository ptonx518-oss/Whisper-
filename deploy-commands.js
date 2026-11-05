
require("dotenv").config();

const {
    REST,
    Routes,
    SlashCommandBuilder,
    ChannelType,
    PermissionFlagsBits
} = require("discord.js");

const commands = [
    new SlashCommandBuilder()
        .setName("whisper")
        .setDescription("ติดตั้งระบบฝากบอก Whisper")
        .setDefaultMemberPermissions(
            PermissionFlagsBits.Administrator
        )
        .addChannelOption(option =>
            option
                .setName("channel")
                .setDescription("เลือกห้องที่จะส่งหน้าเมนูฝากบอก")
                .addChannelTypes(ChannelType.GuildText)
                .setRequired(true)
        )
        .toJSON()
];

async function deployCommands() {
    const {
        TOKEN,
        CLIENT_ID,
        GUILD_ID
    } = process.env;

    if (!TOKEN || !CLIENT_ID || !GUILD_ID) {
        console.error("❌ กรุณาตรวจสอบ TOKEN, CLIENT_ID และ GUILD_ID ใน .env");
        process.exit(1);
    }

    const rest = new REST({
        version: "10"
    }).setToken(TOKEN);

    try {
        console.log("กำลังลงทะเบียนคำสั่ง Whisper...");

        await rest.put(
            Routes.applicationGuildCommands(
                CLIENT_ID,
                GUILD_ID
            ),
            {
                body: commands
            }
        );

        console.log("================================");
        console.log("✅ ลงทะเบียนคำสั่งสำเร็จ!");
        console.log("💗 Whisper พร้อมใช้งาน");
        console.log("คำสั่ง: /whisper");
        console.log("================================");

    } catch (error) {
        console.error("❌ ลงทะเบียนคำสั่งไม่สำเร็จ:");

        if (error.code === 20012) {
            console.error(
                "TOKEN และ CLIENT_ID อาจเป็นคนละ Application"
            );
        }

        console.error(error);
    }
}

deployCommands();
