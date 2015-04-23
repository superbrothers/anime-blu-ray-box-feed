var request = require("request"),
    async = require("async"),
    jsdom = require("jsdom"),
    jade = require("jade"),
    constants = require("./constants.js");

var GITHUB_TOKEN = process.env.GITHUB_TOKEN || "THIS IS GITHUB TOKEN";

async.waterfall(
    [
        function (callback) {
            request(
                {
                    method: "GET",
                    url: constants.TARGET_URL,
                    headers: {
                        "User-Agent": constants.HTTP_USER_AGENT
                    },
                    timeout: constants.HTTP_TIMEOUT
                },
                function (err, response, body) {
                    if (err) {
                        callback(err);
                        return;
                    }
                    callback(null, body);
                }
            );
        },
        function (body, callback) {
            jsdom.env(body, ["http://code.jquery.com/jquery.js"], function (err, window) {
                if (err) {
                    callback(err);
                    return;
                }
                callback(null, window.$);
            });
        },
        function ($, callback) {
            var items = $(".s-item-container").map(function () {
                var $item = $(this);
                return {
                    title: $item.find(".s-access-detail-page").attr("title"),
                    link: $item.find(".s-access-detail-page").attr("href"),
                    html: $item.html()
                };
            });

            var xml = jade.renderFile("./views/rss.jade", {
                targetUrl: constants.TARGET_URL,
                items: items
            });

            callback(null, xml);
        },
        function (xml, callback) {
            request(
                {
                    method: "PATCH",
                    url: constants.GIST_API_URL,
                    qs: {
                        access_token: GITHUB_TOKEN
                    },
                    headers: {
                        "User-Agent": "node " + process.version
                    },
                    json: true,
                    body: {
                        files: {
                            "anime-bluray-box.rss": {
                                content: xml
                            }
                        }
                    },
                    timeout: constants.HTTP_TIMEOUT
                },
                function (err, response, body) {
                    if (err) {
                        callback(err);
                        return;
                    }
                    if (response.statusCode !== 200) {
                        callback(new Error(JSON.stringify(body)));
                        return;
                    }
                    callback(null);
                }
            );
        }
    ],
    function (err) {
        if (err) {
            throw err;
        }
        console.info("done");
    }
);
// vim: set fenc=utf-8 ts=4 sts=4 sw=4 :
