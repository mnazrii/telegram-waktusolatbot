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


//     await bot.telegram.sendMessage(CHAT_ID,`
//     Saya akan send reminder <b>10 minit sebelum solat Magrib, Isyak dan Subuh</b> setiap hari.
//     Sesiapa yang perasan dan tengah free tu moh la kita turun ya.. 
//     InsyaAllah hati akan lebih tenang.

//     <b>Terima kasih</b>
// `.replaceAll(`    `,''),{parse_mode: 'HTML'})



    // var praydata1 = await readprayertime(date)
    // var prayertimetoday = [praydata1.fajr, praydata1.dhuhr, praydata1.asr, praydata1.maghrib, praydata1.isha];
    // var praydatatime = prayertimetoday.map((x) => x.split(':'));
    // // console.log (praydatatime.fajr);
    //         //10 mins before reminder subuh [0],magrib [3],isyak [4]
    //         [praydatatime[0], praydatatime[3], praydatatime[4]].forEach(pdreminder => {
    //             let timetmp = Number(pdreminder[0])*60+Number(pdreminder[1]) - 10;
                
    //             //if 0000 hours
    //             if(timetmp<0)
    //                 timetmp = timetmp+1440;
                
    //             let timetmparr = [parseInt(timetmp / 60), timetmp % 60]; 
    //             // let schstr = `${pdreminder[1]} ${pdreminder[0]} * * *`;
    //             let schstr2 = `${timetmparr[1]} ${timetmparr[0]} * * *`;
                
    //             console.log (schstr2);
    //         });

    // for (let index = 0; index < prayertimetoday.length; index++) {
    //     abc = await bot.telegram.sendMessage(CHAT_ID,text1.replace("{0}", waktu[index]).replace("{1}", prayertimetoday[index]),{parse_mode: 'HTML'})
    //     console.debug(`set scheduler ${waktu[index]} -  ${praydatatime[index][1]} ${praydatatime[index][0]} * * *`);
    // }
    // return;



    //get latest prayer data if not yet done
    if (!fs.existsSync(filename)) {
        await getprayertimes()
    }

    //read prayer data and update scheduler
    await updateprayertime();

    //run scheduler to set new prayer time  every one day
    updateprayert = schedule.scheduleJob(`0 0 * * *`, async () => {
        console.debug(`trigger set new prayer time scheduler`);

        date = new Date();
        filename = date.getFullYear() + '-data.json'

        if (!fs.existsSync(filename))
            getprayertimes()

        await updateprayertime();
    })
    console.debug(`set updateprayert scheduler 0 0 * * *`);

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

/**
 * Update prayer time scheduler. Send notification on scheduled time
 * 5 times a day
 */
 const updateprayertime = async () => {

        var praydata1 = await readprayertime(date)
        var prayertimetoday = [praydata1.fajr, praydata1.dhuhr, praydata1.asr, praydata1.maghrib, praydata1.isha];
        var praydatatime = prayertimetoday.map((x) => x.split(':'));

        //schedule prayer time notification
        for (let index = 0; index < prayertimetoday.length; index++) {
            
            let schstr = `${praydatatime[index][1]} ${praydatatime[index][0]} * * *`
            prayerscheduler[index] = schedule.scheduleJob(schstr, () => //{}
                bot.telegram.sendMessage(CHAT_ID,text1.replace("{0}", waktu[index]).replace("{1}", prayertimetoday[index]),{parse_mode: 'HTML'})
            )
            console.debug(`set scheduler ${waktu[index]} - ${schstr}`);

        }
        

        //schedule 10 mins before reminder
        let i = 0;
        const alerptime = { 
            "Subuh":praydatatime[0], 
            "Maghrib":praydatatime[3], 
            "Ishak": praydatatime[4]
        }

        Object.keys(alerptime).forEach((key) => {

            //convert to mins, -10 mins
            let timetmp = Number(alerptime[key][0])*60+Number(alerptime[key][1]) - 10;
            
            //if 0000 hours
            if(timetmp<0)
                timetmp = timetmp+1440;
            
            //convert back to hr:mm
            let timetmparr = [parseInt(timetmp / 60), timetmp % 60]; 
            
            //set task scheduler
            let schstr2 = `${timetmparr[1]} ${timetmparr[0]} * * *`;
            
            let msgstr = `Waktu solat <b>Fardu ${key} </b>akan masuk dalam masa 10 minit. Jom solat berjemaah di surau kita!`;
            console.debug(msgstr)

            alertcheduler[++i] = schedule.scheduleJob(schstr2, () =>  //{}
                bot.telegram.sendMessage(CHAT_ID, msgstr, {parse_mode: 'HTML'})
            )
            console.debug(`set reminder scheduler - ${schstr2} ${alerptime[key].join(":")}  ${timetmparr.join(":")} `);
        })


    



}


main();