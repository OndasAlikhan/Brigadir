require('dotenv').config()

const {Client, Intents} = require('discord.js');
const {PrismaClient} = require('@prisma/client')
const prisma = new PrismaClient()

const client = new Client({
    intents: [
        Intents.FLAGS.GUILDS,
        Intents.FLAGS.GUILD_MESSAGES,
        Intents.FLAGS.GUILD_EMOJIS_AND_STICKERS,
        Intents.FLAGS.GUILD_MEMBERS,
        Intents.FLAGS.GUILD_MESSAGE_REACTIONS,
        Intents.FLAGS.DIRECT_MESSAGE_REACTIONS
    ],
    partials: ['MESSAGE', 'CHANNEL', 'REACTION'],
});

client.on('ready', () => {
    console.log(client.user.tag)
});

client.on('interactionCreate', async interaction => {
    if (!interaction.isCommand()) return;

    const {commandName} = interaction;

    if (commandName === 'about') {
        console.log(interaction)
        await interaction.reply("Brigadir v0.0.1, https://github.com/sabadoryo/Brigadir");
    }
});

client.on('messageCreate', async msg => {
    if (msg.content.startsWith('!!')) {
        let params = msg.content.replace('!!', '').split(' ');
        let command = params[0]

        if (command === 'rc') {
            if (params.length !== 3) {
                await msg.reply('Неверный синтаксис дэцик. Вот так !!rc {дело} {количество работяг} ,пример: !!rc Дота 10')
                return;
            }

            if (!isNumeric(params[2])) {
                await msg.reply('Эм ты можешь вписать количество 2ым параметром, чел?')
                return;
            }

            const call = await prisma.call.findFirst({
                where: {
                    is_active: true
                }
            })

            if (call) {
                await msg.reply(`Сейчас уже идет сбор на ${call.name}`)
                return;
            }

            await prisma.call.create({
                data: {
                    is_active: true,
                    cur_user_amount: 0,
                    user_amount_limit: parseInt(params[2]),
                    name: params[1]
                }
            })

            await msg.channel.send(`@everyone Набираю **${params[2]}** работяг на ${params[1]}.\n + в чат если за`)
        }

        if (command === 'cancel') {
            if (params.length !== 2) {
                await msg.reply('Неверный синтаксис, !!cancel <commandName>')
                return;
            }

            const call = await prisma.call.findFirst({
                where: {
                    is_active: true
                }
            })

            if (call) {
                await prisma.call.update({
                    where: {
                        id: call.id
                    },
                    data: {
                        is_active: false
                    }
                })
                await msg.reply(`Созыв работяг на **${call.name}** отменен!`)
            }
        }

        if (command === 'help') {
            await msg.reply(
                "Список доступных комманд:\n" +
                "1. Rabotyagi call - **!!rc <названиеДела> <нужное количество работяг>**\n" +
                "2. Cancel rabotyagi call - **!!cancel rc**\n" +
                "3. Кто же этот бригадир ө **!!introduce**" +
                "\n\n\n\n\n" +
                "https://github.com/sabadoryo/Brigadir"
            )
        }

        if (command === 'introduce') {
            await msg.channel.send({content: 'Бригадир завода', files: ['./static/img/brigadir.jpg']})
        }
    }
    if (msg.content === '+') {

        const call = await prisma.call.findFirst({
            where: {
                is_active: true
            }
        })

        if (call) {
            const user = await createUserIfDoesNotExist(msg.member.user)

            const userAlreadyConnectedToCall = await prisma.callsUsers.findFirst({
                where: {
                    userId: user.id,
                    callId: call.id
                }
            })

            let callCopy = call;

            if (userAlreadyConnectedToCall == null) {
                const call = await prisma.call.update({
                    where: {
                        id: callCopy.id
                    },
                    data: {
                        users: {
                            create: [
                                {
                                    user: {
                                        connect: {id: user.id}
                                    }
                                }
                            ]
                        },
                        cur_user_amount: callCopy.cur_user_amount + 1
                    },
                })

                console.log(call);

                let left = call.user_amount_limit - call.cur_user_amount;

                if (left > 0) {
                    prisma.$executeRaw`update "Call" set cur_user_amount = cur_user_amount + 1 where id = ${call.id}`
                }

                if (Math.round(call.user_amount_limit / 2) === left) {
                    await msg.channel.send(`@everyone Осталось добрать ${call.user_amount_limit - call.cur_user_amount} работяг`)
                }

                if (left === 0) {
                    await prisma.call.update({
                        where: {
                            id: call.id
                        },
                        data: {
                            is_active: false
                        }
                    })

                    let list = await prisma.call.findFirst({
                        where: {
                            id: call.id
                        },
                        include: {
                            users: {
                                include: {
                                    user: true
                                }
                            }
                        }
                    })

                    let message = "";

                    list.users.forEach(elem => {
                        message += `**${elem.user.name}**` + "\n";
                    })

                    await msg.channel.send(`Сбор закрыт, список работяг в ${call.name}:\n` + message)
                }
            }
        }
    }
})

client.on('guildMemberAdd', async (member) => {
    console.log('MEMBER ADDED')
    const channel = member.guild.channels.cache.find(channel => channel.name === "welcome");
    await channel.send({
        content: "**Добро пожаловать на завод!**\nДобавь реакцию серпа, чтобы залутать фри звание",
        files: [
            './static/img/zavod.jpg'
        ]
    }).then(message => {
        message.react("⛏️")
    });
})

client.on('messageReactionAdd', async (reaction, user) => {
    if (!user.bot) {
        if (reaction.emoji.name === '⛏️') {
            const role = reaction.message.guild.roles.cache.find(r => r.name === 'Чел');
            const guild = reaction.message.guild;
            const memberWhoReacted = guild.members.cache.find(member => member.id === user.id);

            memberWhoReacted.roles.add(role);
        }
    }
})

client.login(process.env.TOKEN);


function isNumeric(n) {
    return !isNaN(parseFloat(n)) && isFinite(n);
}

function createUserIfDoesNotExist(user) {

    console.log(user)

    return prisma.user.upsert({
        where: {
            discord_id: user.id
        },
        create: {
            discord_id: user.id,
            name: user.username
        },
        update: {
            discord_id: user.id
        }
    });
}
