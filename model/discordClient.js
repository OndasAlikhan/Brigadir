const {Client, Intents, MessageEmbed, MessageActionRow, MessageButton} = require('discord.js');

export class DiscordClientManager {
    constructor(dbConnection) {
        this.dbConnection = dbConnection
    }
    static discordClient;
    static initDiscordClient() {
        this.discordClient = new Client({
            intents: [
                Intents.FLAGS.GUILDS,
                Intents.FLAGS.GUILD_MESSAGES,
                Intents.FLAGS.GUILD_EMOJIS_AND_STICKERS,
                Intents.FLAGS.GUILD_MEMBERS,
                Intents.FLAGS.GUILD_MESSAGE_REACTIONS,
                Intents.FLAGS.DIRECT_MESSAGE_REACTIONS,
                Intents.FLAGS.GUILD_VOICE_STATES,
                Intents.FLAGS.DIRECT_MESSAGES
            ],
          partials: ['MESSAGE', 'CHANNEL', 'REACTION'],
        });

        this.discordClient.on('messageCreate', async msg => {
            if (msg.author.bot) return;

            if (msg.guild === null) {
                if (msg.author.id === '401046879015534592') {
                    let cnt = msg.content.toLowerCase();
                    if (cnt === 'photo' || cnt === 'фотку' || cnt === 'фото' || cnt === 'фотка') {
                        await msg.reply('Все верно герл\n Автор: Darrem');
                        await msg.reply({
                            content: 'Отправил я эту пикчу в новый год и как раз шел к тебе домой:)',
                            files: ['./static/img/myphoto.jpg']
                        })
                    } else {
                        msg.reply('аахахахахах мааа ващесын \n Подсказка: photo');
                    }
                }

                return;
            }

            const user = await createUserIfDoesNotExist(msg.member.user)

        })
    }

    static createUserIfDoesNotExist(user) {
        return this.dbConnection.user.upsert({
            where: {
                discord_id: user.id
            },
            create: {
                discord_id: user.id,
                name: user.username,
                discord_score: 0
            },
            update: {
                discord_id: user.id,
                name: user.username
            }
        });
    }

    static async addDiscordScore(user, point) {
        await this.dbConnection.user.update({
            where: {
                discord_id: user.discord_id
            },
            data: {
                discord_score: user.discord_score + point
            }
        })
    }
    

    static async waitAndDo(times, msg) {
        if (times < 0) {
            return;
        }

        setTimeout(function () {
            if (times === 1) {
                const res = await msg.channel.send(`Удаление сервера пройзойдет через: ${times}`)
                res.reply('де наебка');
                return;
            } else {
                msg.channel.send(`Удаление сервера пройзойдет через: ${times}`)
            }
            waitAndDo(times - 1, msg);
        }, 1000);
    }
}