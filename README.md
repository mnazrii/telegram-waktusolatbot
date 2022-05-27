# telegram-waktusolatbot
Data ambil dari esolat Jakim
        'https://www.e-solat.gov.my/index.php?r=esolatApi/takwimsolat&period=year&zone=<YOUR_ZONE>'
        
Untuk dapatkan chatid/group id  https://api.telegram.org/bot<YourBOTToken>/getUpdates
        
buat file secret.json yg mengandungi token secret dan chatid/group id sebelum boleh run.
  cth:      
        `{
                "token":"1060XXXXXXXXXXXXXXXXXXXAE_U",
                "chat_id":"-725570XXX"
        }`

untuk dapatkan token id. pergi ke @botfarther dalam telegram. dan tekan /newbot.
add bot yg dah dibuat dalam group untuk membolehkan mesej dihantar. 

        Run:
        cd telegram-waktusolatbot
        npm install
        node index.js
