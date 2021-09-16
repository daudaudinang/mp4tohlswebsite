var express = require("express");
var router = express.Router();
var multer = require("multer");
var checkLogin = require("../../my_modules/checklogin.js");
var File = require('../../model/File.js');
const mv = require('mv');

var storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "./public/upload");
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + "_" + file.originalname);
  },
});
var upload = multer({ storage: storage });
const ffmpeg = require("fluent-ffmpeg");

ffmpeg.setFfmpegPath("./ffmpeg/bin/ffmpeg.exe");

ffmpeg.setFfprobePath("./ffmpeg/bin/ffprobe.exe");

router.get("/", checkLogin, function (req, res, next) {
    res.render("site/index");
});

router.post("/", checkLogin, upload.single('video'), function (req, res, next) {
    // Lấy ra username
    let username = req.user.username;
    let filename = req.file.filename;

    mv("./public/upload/"+ filename,"./public/upload/"+ username + "/input/" + filename, (err) => {
        if(err) return res.send(err);
        console.log("Move File Successfully");
    });

    ffmpeg("./public/upload/"+ username + "/input/" + filename)
    .outputOptions([
        '-f hls',
        '-max_muxing_queue_size 2048',
        '-hls_time 1',
        '-hls_list_size 0',
        '-hls_segment_filename', './public/upload/'+ username + "/segment/"+filename+'-%d.ts',
        '-hls_base_url',req.app.locals.baseURL + '/upload/' + username + "/segment/"
    ])
    .output("./public/upload/"+ username + "/output/" + filename+'.m3u8')
    .on('start', function (commandLine) {
        console.log('Spawned Ffmpeg with command: ' + commandLine);
    })
    .on('error', function (err, stdout, stderr) {
        console.log('An error occurred: ' + err.message, err, stderr);
    })
    .on('progress', function (progress) {
        console.log('Processing: ' + progress.percent + '% done');
    })
    .on('end', function (err, stdout, stderr) {
        console.log('Finished processing!' /*, err, stdout, stderr*/);
        // Lưu dữ liệu vào server xong. Giờ lưu thông tin vào server
        let file = new File({
            username: req.user.username,
            file_upload: filename,
            file_converted: filename+'.m3u8'
        });
        file.save().then(function(){
            res.redirect('/admin/file/danh-sach');
        })
    })
    .run();
});

module.exports = router;
