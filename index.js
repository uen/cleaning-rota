const 
    googleSpreadsheet = require("google-spreadsheet"),
    facebook = require("facebook-chat-api"),
    moment = require("moment"),
    
    env = require("./environment");

console.log(`Initializing ${process.env.APP_NAME}`);

const document = new googleSpreadsheet(process.env.DOCUMENT_KEY);

const cleaningSectors = ["kitchen", "bins", "toilet", "showers", "stairs-and-halls"];
const sectorStrings = ["clean the kitchen", "take our the bins", "clean the toilet", "clean the showers", "clean the stairs and halls"];
const sectorStringsCompleted = ["cleaning the kitchen", "taking out the bins", "cleaning the toilet", "cleaning the showers", "cleaning the stairs and halls"];
const PEOPLE = {
    Mani : "Manolis Vrondakis",
    Angus : "Angus Young",
    Dan : "Dan Armstrong",
    "Ben A" : "Ben Asquith",
    "Ben E" : "Ben Eastwood",
};

const PEOPLE_IDS = {
    "100002212875359" : "Mani",
    "100000761306740" : "Angus",
    "1061579433" : "Dan",
    "100000441897262" : "Ben A",
    "1199940808" : "Ben E",
}

const EMOJIS = ["🔥", "💓", "👀", "💧", "🌊", "💃", "🌴", "💡", "🐎", "🐔", "🐙"];
const ANGRY_EMOJIS = ["😠", "🙃"];
const INSULTS = [
    "Useless",
    "You lazy prick"
];

const TRIGGER_WORD = "Snoop,";

const SECTOR_STATUS = {
    COMPLETED : 1,
    ACTIVE : 2,
    REMINDED : 3,
    OVERDUE : 4,
    COMPLETED : 5
};

(async() => {

    // Should move this to its own module, authenticate facebook
    const messenger = await new Promise((res, rej) => facebook({
        email : env.FB_USERNAME,
        password : env.FB_PASSWORD
    }, (err, api) => {
        if(err) return rej(err);
        res(api);
    }));

    // Authenticate document
    await new Promise((res) => {
        document.useServiceAccountAuth(env.GOOGLE_CREDENTIALS, (e) => {
            res();
        });
    });

    // Get sheet
    const sheet = await new Promise((res, rej) => {
        document.getInfo((err, info) => {
            if(err) return rej(err);
            console.log('Loaded doc: '+info.title+' by '+info.author.email);
            console.log(info);
            res(info.worksheets[0]);
        });
    });

    // Get all rows
    const firstRow = await new Promise((res, rej) => sheet.getRows({
        offset: 0,
        limit : 1
    }, (err, rows) => {
        if(err) return rej(err);
        res(rows[0]);
    }));

    const startDate = moment(firstRow.date, "DD/MM/YY");

    let statusCells;
    let thisWeek;

    // Listen to chat
    messenger.listen(async (err, messageObj) => {
        if(err) return console.error(err);
        console.log(messageObj);
        const message = messageObj.body;
        console.log(message.startsWith)
        if(message.toLowerCase().startsWith(`${TRIGGER_WORD.toLowerCase()} `)){
            const emoji = EMOJIS[Math.floor(Math.random()*EMOJIS.length)];

            const personIndex = PEOPLE_IDS[messageObj.senderID];
            if(personIndex){
                console.log(message.substr(`${TRIGGER_WORD.length + 1}`).toLowerCase())
                let sectorIndex;
                switch(message.substr(`${TRIGGER_WORD.length + 1}`).toLowerCase()){
                    case "task completed":
                        for(sectorKey in cleaningSectors){
                            if(thisWeek[cleaningSectors[sectorKey]] === personIndex){
                                sectorIndex = sectorKey;
                                continue;
                            }
                        }

                        if(!thisWeek[cleaningSectors[sectorIndex]])
                            response = `Sorry ${PEOPLE[personIndex]}, I could not find a sector attached to you this week.`;
                        else {
                            response = `Thanks ${PEOPLE[personIndex]} for ${sectorStringsCompleted[sectorIndex]}.`
                            statusCells[sectorIndex].value = SECTOR_STATUS.COMPLETED;
                            await new Promise((res, rej) => sheet.bulkUpdateCells(statusCells, (err) => {
                                if(err) return rej(err);
                                res();
                            }));
                        }
                    break;
                    case "what's my task":
                        for(sectorKey in cleaningSectors){
                            if(thisWeek[cleaningSectors[sectorKey]] === personIndex){
                                sectorIndex = sectorKey;
                                break;
                            }
                        }
                        
                        if(!thisWeek[cleaningSectors[sectorIndex]])
                            response = `Sorry ${PEOPLE[personIndex]}, I could not find a sector attached to you this week.`;
                        else {
                            response = `Your task for this week is to ${sectorStrings[sectorIndex]}.`;
                        }
                    break;
                    case "help":
                        response = `I'm Snoop and I manage our cleaning rota. Start your command with 'Snoop, '. Available commands: "what\'s my task", "task completed" and "help".`;
                    break;
                    default:
                        response = 'Unrecognized command. Available commands: "what\'s my task", "task completed", "help".';
                }

            } else {
                response = `Sorry, we could not find you on the cleaning rota`
            }

            messenger.sendMessage(`${emoji} ${response}`, env.CHAT_ID);
        }
    })

    // Process events
    let process;
    process = (async () => {
        const currentDate = moment();
        const currentWeek = moment().day(0).diff(startDate, "weeks");
        console.log("CURRENT WEEK IS: ", currentWeek, "start date is: ", startDate.format("DD/MM/YYYY"), "now is: ", currentDate.format("DD/MM/YYYY"));

        thisWeek = await new Promise((res, rej) => sheet.getRows({
            offset : currentWeek,
            limit : 1
        }, (err, rows) => {
            if(err) return rej(err);
            res(rows[0]);
        }));

        const lastWeek = currentWeek - 1;
        const lastWeekCells = currentWeek !== 0 ? await new Promise((res, rej) => sheet.getCells({
            'min-row' : lastWeek + 1 + 1,
            'max-row' : lastWeek + 1 + 1,
            'min-col' : 1 + cleaningSectors.length + 1 + 1,
            'max-col' : 1 + cleaningSectors.length + cleaningSectors.length + 1,
            'return-empty' : true
        }, (err, cells) => {
            if(err) return false;
            res(cells || false)
        }))

        
        // Get the status cells so we can update them later
        statusCells = await new Promise((res, rej) => sheet.getCells({
            'min-row' : currentWeek + 1 + 1,
            'max-row' : currentWeek + 1 + 1,
            'min-col' : 1 + cleaningSectors.length + 1 + 1,
            'max-col' : 1 + cleaningSectors.length + cleaningSectors.length + 1,
            'return-empty' : true
        }, (err, statusCells) => {
            if(err) return rej(err);
            res(statusCells)
        }));

        // console.log()
        let updatedStatus = true;
        if(currentWeek !== 0 && lastWeekCells.filter((status) => !status || !Number(status)).reduce((a, b) => (a && b))){
            for(const sectorKey in cleaningSectors){
                const angryEmoji = ANGRY_EMOJIS[Math.floor(Math.random()*ANGRY_EMOJIS.length)];
                const insult = INSULTS[Math.floor(Math.random()*INSULTS.length)];

                messenger.sendMessage(`${angryEmoji} you failed to ${sectorStrings[sectorKey]}. ${insult}`, env.CHAT_ID);
                statusCells[sectorKey].value = SECTOR_STATUS.OVERDUE;
            }
        }

        for(const sectorKey in cleaningSectors){
            const sector = cleaningSectors[sectorKey];
            const asignee = PEOPLE[thisWeek[sector]];
            const status = thisWeek[`${sector}-status`];

            const emoji = EMOJIS[Math.floor(Math.random()*EMOJIS.length)];
            if(!status || !Number(status)){
                messenger.sendMessage(`${emoji} ${asignee} your task this week is to ${sectorStrings[sectorKey]}.`, env.CHAT_ID);
                statusCells[sectorKey].value = SECTOR_STATUS.ACTIVE;

                await new Promise((res) => setTimeout(res, 1000));
            } else if(status === SECTOR_STATUS.ACTIVE && currentDate.day() === 6){
                messenger.sendMessage(`${emoji} ${asignee} - reminder that you need to ${sectorStrings[sectorKey]} by tonight.`, env.CHAT_ID);
                statusCells[sectorKey].value = SECTOR_STATUS.REMINDED;
            } else {
                updatedStatus = false;
            }
        }


        if(updatedStatus){
            await new Promise((res, rej) => sheet.bulkUpdateCells(statusCells, (err) => {
                if(err) return rej(err);
                res();
            }));
        }

        setTimeout(process, env.PROCESS_TIME)
    });

    process();
})();

process.on('uncaughtException', (err) => {
	console.error(err);
});