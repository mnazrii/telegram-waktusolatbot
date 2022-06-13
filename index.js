process.env['NODE_TLS_REJECT_UNAUTHORIZED'] = 0

var axios = require('axios')
var fs = require('fs')
const { Telegraf } = require('telegraf')
const schedule = require('node-schedule')
const { TOKEN,CHAT_ID } = require('./secret')
const bot = new Telegraf(TOKEN);


var text1 = "Telah masuk waktu solat <b>Fardu {0}</b> bagi kawasan Kuala Lumpur pada {1}";
var waktu = ["Subuh", "Zohor", "Asar", "Magrib", "Isyak",];


var date = new Date();
var filename = date.getFullYear() + '-data.json'
var prayerscheduler = [];
var alertcheduler = [];


const main = async () => {


    console.debug(`current date ${date.toDateString()}`);


    //get latest prayer data if not yet done
    if (!fs.existsSync(filename)) {
        await getprayertimes()
    }

    //read prayer data and update scheduler
    await updateprayertime();

    //run scheduler to set new prayer time  every one day
    let uptprayerstr = "0 0 * * *";
    updateprayert = schedule.scheduleJob(uptprayerstr, async () => {
        console.debug(`trigger set new prayer time scheduler`);

        date = new Date();
        filename = date.getFullYear() + '-data.json'

        if (!fs.existsSync(filename))
            getprayertimes()

        await updateprayertime(true);
    })
    console.debug(`set updateprayert ${uptprayerstr}`);

}





/**
 * Get prayer time data from esolat **website write to xxxx-data.json
 */
 const getprayertimes = async () => {
    res = await axios.get(
        'https://www.e-solat.gov.my/index.php?r=esolatApi/takwimsolat&period=year&zone=WLY01',
    )

    fs.writeFileSync(filename, JSON.stringify(res.data))
    console.debug(`download latest file ${filename}`)
}



/**
 * Read downloaded prayer time for particular date
 */
 const readprayertime = async (date) => {
    timtable = JSON.parse(fs.readFileSync(filename))
    var dateday = daysIntoYear(date)

    var ret = timtable.prayerTime[dateday - 1];
    console.debug(`return prayer data ${JSON.stringify(ret)}`)
    return ret;
}

/**
 * Convert date to day index of the year. 1/1/2022 will return 0; 31/12/2022 will return 364
 */
 const daysIntoYear = (date) => {
    var daysIntoYear = (Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) -
        Date.UTC(date.getFullYear(), 0, 0)) / 24 / 60 / 60 / 1000;

    console.debug(`return daysIntoYear  ${daysIntoYear}`);
    return daysIntoYear;
}

const timestrToAMPM = (timeString) => {
    let H = +timeString.substr(0, 2);
    let h = H % 12 || 12;
    let ampm = (H < 12 || H === 24) ? "AM" : "PM";
    timeString = h + timeString.substr(2, 3) + ampm;
    return timeString;
}

/**
 * Update prayer time scheduler. Send notification on scheduled time
 * 5 times a day
 */
 const updateprayertime = async (isupdate) => {

        //read latest table
        var praydata1 = await readprayertime(date)  
        
        //disable other prayer time alert
        var prayertimetoday = [praydata1.fajr , praydata1.dhuhr, praydata1.asr, praydata1.maghrib, praydata1.isha];
        
        
        //split to hh mm array
        var praydatatime = prayertimetoday.map((x) => x.split(':'));
        
        //split to am/pm time
        var praydatatimeAMPM = prayertimetoday.map((x)=>timestrToAMPM(x));
        
        //schedule prayer time notification
        for (let index = 0; index < prayertimetoday.length; index++) {
            
            //text message to send
            let chatstr =  text1.replace("{0}", waktu[index]).replace("{1}", praydatatimeAMPM[index]);

            //cancel exisiting job
            if(isupdate)
                prayerscheduler[index].cancel();

            let schstr = `${praydatatime[index][1]} ${praydatatime[index][0]} * * *`
            prayerscheduler[index] = schedule.scheduleJob(schstr, () => //{}
                bot.telegram.sendMessage(CHAT_ID,chatstr,{parse_mode: 'HTML'})
            )
            console.debug(`set scheduler ${waktu[index]} - ${schstr} ${chatstr} `);

        }
        

        // //daily reminder
        // prayerschedulerx = schedule.scheduleJob('37 17 * *', () => //{}
        //         bot.telegram.sendMessage(CHAT_ID,`
        //         Waktu solat bagi kawasan Kuala Lumpur:
        //         Subuh  ${praydatatimeAMPM[0]}
        //         Zohor  ${praydatatimeAMPM[1]}
        //         Asar   ${praydatatimeAMPM[2]}
        //         Magrib ${praydatatimeAMPM[3]}
        //         Isyak  ${praydatatimeAMPM[4]}
        //         `,{parse_mode: 'HTML'})
        //     )


        //schedule 10 mins before reminder
        let i = 0;
        const alerptime = { 
            "Subuh":praydatatime[0], 
            "Maghrib":praydatatime[3], 
            "Ishak": praydatatime[4]
        }

        Object.keys(alerptime).forEach((key) => {

            if(isupdate)
                alertcheduler[i].cancel();


            //convert to mins, -10 mins
            let timetmp = Number(alerptime[key][0])*60+Number(alerptime[key][1]) - 10;
            
            //if 0000 hours
            if(timetmp<0)
                timetmp = timetmp+1440;
            
            //convert back to hr:mm
            let timetmparr = [parseInt(timetmp / 60), timetmp % 60]; 
            
            //set task scheduler
            let schstr2 = `${timetmparr[1]} ${timetmparr[0]} * * *`;
            
            let msgstr = `Waktu solat <b>Fardu ${key} </b>akan masuk dalam masa 10 minit pada ${timestrToAMPM(alerptime[key].join(':'))}. Jom solat berjemaah di surau kita!`;
            console.debug(msgstr)

            alertcheduler[i] = schedule.scheduleJob(schstr2, () =>  //{}
                bot.telegram.sendMessage(CHAT_ID, msgstr, {parse_mode: 'HTML'})
            )
            console.debug(`set reminder scheduler - ${schstr2} ${alerptime[key].join(":")}  ${timetmparr.join(":")} `);
            
            i++;
        })


    



}


main();
