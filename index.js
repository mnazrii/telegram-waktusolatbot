process.env['NODE_TLS_REJECT_UNAUTHORIZED'] = 0

var axios = require('axios')
var fs = require('fs')

const schedule = require('node-schedule')

var text1 = "Telah masuk waktu solat <b>Fardu {0}</b> bagi kawasan Kuala Lumpur pada {1}";
var waktu = ["Subuh", "Zohor", "Asar", "Magrib", "Isyak",];


var date = new Date();
var filename = date.getFullYear() + '-data.json'
var prayerscheduler = [];
var token,chat_id;
/**
 * Get prayer time data from esolat **website
 */
var getprayertimes = async () => {
    res = await axios.get(
        'https://www.e-solat.gov.my/index.php?r=esolatApi/takwimsolat&period=year&zone=WLY01',
    )

    fs.writeFileSync(filename, JSON.stringify(res.data))
    console.debug(`download latest file ${filename}`)
}

/**
 * Send notification via telegram
 */
var notificationCallback = async (text = "negaraku", chat_id = "-725570817") => {

    res = await axios.get(
        `https://api.telegram.org/bot${token}/sendMessage?parse_mode=HTML&chat_id=${chat_id}&text=${text}`
    );
    console.debug(`send notification ${JSON.stringify(res.data)}`)
}

var imglinks = [
    'https://pbs.twimg.com/media/E0Y_yVAVIAQWjm4.jpg',
    `https://i.ibb.co/H7jxp4H/DOPs-WJUEAYdez-W.jpg`,
    `https://i.ibb.co/fx9JBmD/14925766-1305755386132686-4767847906450935713-n.jpg`,
    'https://i.ibb.co/wyPtNyH/3-2-30.jpg',
    'https://i.ibb.co/jRDqmm5/IMG-20200811-071315.jpg',

]


/**
 * Send notification via telegram with image
 */
var notificationImgCallback = async (url, imgcaption = "", chat_id = "-725570817") => {

    res = await axios.get(
        `https://api.telegram.org/bot${token}/sendPhoto?parse_mode=HTML&chat_id=${chat_id}&photo=${encodeURI(url)}&caption=${imgcaption}`
    )

    console.debug(`send notification image ${JSON.stringify(res.data)}`)
}

/**
 * Read downloaded prayer time for particular date
 */
var readprayertime = async (date) => {
    timtable = JSON.parse(fs.readFileSync(filename))
    var dateday = daysIntoYear(date)

    var ret = timtable.prayerTime[dateday - 1];
    console.debug(`return prayer data ${JSON.stringify(ret)}`)
    return ret;
}

/**
 * Convert date to day index of the year. 1/1/2022 will return 0; 31/12/2022 will return 364
 */
var daysIntoYear = (date) => {
    var daysIntoYear = (Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) -
        Date.UTC(date.getFullYear(), 0, 0)) / 24 / 60 / 60 / 1000;

    console.debug(`return daysIntoYear  ${daysIntoYear}`);
    return daysIntoYear;
}

/**
 * Update prayer time scheduler. Send notification on scheduled time
 * 5 times a day
 */
var updateprayertime = async () => {
    if (fs.existsSync(filename)) {

        var praydata1 = await readprayertime(date)
        var prayertimetoday = [praydata1.fajr, praydata1.dhuhr, praydata1.asr, praydata1.maghrib, praydata1.isha];
        var praydatatime = prayertimetoday.map((x) => x.split(':'));


        for (let index = 0; index < prayertimetoday.length; index++) {

            prayerscheduler[index] = schedule.scheduleJob(`${praydatatime[index][1]} ${praydatatime[index][0]} * * *`, () =>
                notificationImgCallback(imglinks[index], text1.replace("{0}", waktu[index]).replace("{1}", prayertimetoday[index]))
            )
            console.debug(`set scheduler ${waktu[index]} - ${praydatatime[index][1]} ${praydatatime[index][0]} * * *`);

        }

    }



}
    ;

(async () => {


    // var praydata1 = await readprayertime(date)
    // var prayertimetoday = [praydata1.fajr, praydata1.dhuhr, praydata1.asr, praydata1.maghrib, praydata1.isha];
    // var praydatatime = prayertimetoday.map((x) => x.split(':'));
    // for (let index = 0; index < prayertimetoday.length; index++) {
    //     notificationImgCallback(imglinks[index], text1.replace("{0}", waktu[index]).replace("{1}", prayertimetoday[index]));
    //     console.debug(`set scheduler ${waktu[index]} -  ${praydatatime[index][1]} ${praydatatime[index][0]} * * *`);
    // }
    // return;

    var secret = JSON.parse(fs.readFileSync("secret.json"));
    token = secret.token;
    chat_id = secret.chat_id;

    console.debug(`current date ${date.toDateString()}`);

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

})()
