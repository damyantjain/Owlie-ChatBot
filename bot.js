'use strict';

const Wit = require('node-wit').Wit;
const FB = require('./facebook.js');
const Config = require('./const.js');
const {searchItem} = require('./util/amazon_api_util.js');
const JsonUtil = require('./util/json_util.js');


const firstEntityValue = (entities, entity) => {
  const val = entities && entities[entity] &&
    Array.isArray(entities[entity]) &&
    entities[entity].length > 0 &&
    entities[entity][0].value;
  if (!val) {
    return null;
  }
  return typeof val === 'object' ? val.value : val;
};

// Bot actions
const actions = {
  say (sessionId, context, response, cb) {
    console.log(response);

    // Bot testing mode
    if (require.main === module) {
      cb();
      return;
    }

    // Our bot has something to say!
    const recipientId = context._fbid_;
    if (recipientId) {

      let data = null;

      if (JsonUtil.isJsonString(response)) {
        data = JSON.parse(response);
      } else {
        data = {"text": response};
      }

      return FB.fbMessage(recipientId, data, (err, data) => {
        if (err) {
          console.log(
            'Oops! An error occurred while forwarding the response to',
            recipientId,
            ':',
            err
          );
        }
        // Give the wheel back to our bot
        cb();
      });
    } else {
      console.log('Oops! Couldn\'t find user in context:', context);
      cb();
    }
  },

  merge(sessionId, context, entities, response, cb) {
    const giftRecipient = firstEntityValue(entities, 'giftRecipient');
    const giftType = firstEntityValue(entities, 'giftType');
    const gender = firstEntityValue(entities, 'gender');
    const filterByPrice = firstEntityValue(entities, 'filterByPrice');
    const newKeyword = firstEntityValue(entities, 'keyword');

    if (giftRecipient) {
      context.giftRecipient = giftRecipient;
    }
    if (giftType) {
      context.giftType = giftType;
    }
    if (gender) {
      context.gender = gender;
    }
    if (filterByPrice) {
      context.filterByPrice = filterByPrice;
    }
    if (newKeyword) {
      context.newKeyword = newKeyword;
    }
    cb(context);
  },

  error(sessionId, context, error) {
    console.log(error.message);
  },

  //bot executes
  ['getGift'](sessionId, context, cb) {

    console.log("gift type is: " + context.giftType);

    searchItem(context.giftType)
      .then(response => {
        let template = JSON.stringify({
          "attachment": {
            "type": "template",
            "payload": {
              "template_type": "generic",
              "elements": [{
                "title": `${response[0]["ItemAttributes"][0]["Title"]}`,
                "subtitle": `${response[0]["ItemAttributes"][0]["ListPrice"]}`,
                "image_url": `${response[0]["MediumImage"][0]["URL"]}`,
                "buttons": [{
                  "type": "web_url",
                  "url": `${response[0]["DetailPageURL"]}`,
                  "title": "details & buy"
                }, {
                  "type": "web_url",
                  "title": "share"
                }],
              }, {
                "title": `${response[1]["ItemAttributes"][1]["Title"]}`,
                "subtitle": `${response[1]["ItemAttributes"][1]["ListPrice"]}`,
                "image_url": `${response[1]["MediumImage"][1]["URL"]}`,
                "buttons": [{
                  "type": "web_url",
                  "url": `${response[1]["DetailPageURL"]}`,
                  "title": "details & buy"
                }, {
                  "type": "web_url",
                  "title": "share"
                }],
              }, {
                "title": `${response[2]["ItemAttributes"][2]["Title"]}`,
                "subtitle": `${response[2]["ItemAttributes"][2]["ListPrice"]}`,
                "image_url": `${response[2]["MediumImage"][2]["URL"]}`,
                "buttons": [{
                  "type": "web_url",
                  "url": `${response[2]["DetailPageURL"]}`,
                  "title": "details & buy"
                }, {
                  "type": "web_url",
                  "title": "share"
                }],
              }, {
                "title": `${response[3]["ItemAttributes"][3]["Title"]}`,
                "subtitle": `${response[3]["ItemAttributes"][3]["ListPrice"]}`,
                "image_url": `${response[3]["MediumImage"][3]["URL"]}`,
                "buttons": [{
                  "type": "web_url",
                  "url": `${response[3]["DetailPageURL"]}`,
                  "title": "details & buy"
                }, {
                  "type": "web_url",
                  "title": "share"
                }],
              }, {
                "title": `${response[4]["ItemAttributes"][4]["Title"]}`,
                "subtitle": `${response[4]["ItemAttributes"][4]["ListPrice"]}`,
                "image_url": `${response[4]["MediumImage"][4]["URL"]}`,
                "buttons": [{
                  "type": "web_url",
                  "url": `${response[4]["DetailPageURL"]}`,
                  "title": "details & buy"
                }, {
                  "type": "web_url",
                  "title": "share"
                }],
              }]
            }
          }
        });
        context.gift = template;
      });
    cb(context);
  },

  ['showButtons'](sessionId, context, cb) {
    console.log(context);
    context.showButtonOptions = JSON.stringify({
      "text":"showing Buttons..",
      "quick_replies":[
        {
          "content_type":"text",
          "title":"more suggestions",
          "payload":"MORE_SUGGESTIONS"
        },
        {
          "content_type":"text",
          "title":"search by filters",
          "payload":"SEARCH_BY_FILTERS"
        },
        {
          "content_type":"text",
          "title":"new search please!",
          "payload":"NEW_SEARCH_PLEASE"
        }
      ]
    });
    cb(context);
  },

  ['showFilterOptions'](sessionId, context, cb) {
    context.showFilterOptions = JSON.stringify({
      "text":"filter options....",
      "quick_replies":[
        {
          "content_type":"text",
          "title":"Subject",
          "payload":"FILTER_BY_SUBJECT"
        },
        {
          "content_type":"text",
          "title":"Brand Name",
          "payload":"FILTER_BY_BRAND_NAME"
        },
        {
          "content_type":"text",
          "title":"Price Range",
          "payload":"FILTER_BY_PRICE_RANGE"
        },
        {
          "content_type":"text",
          "title":"Size",
          "payload":"FILTER_BY_SIZE"
        }
      ]
    });
    cb(context);
  }

};


const getWit = () => {
  return new Wit(Config.WIT_TOKEN, actions);
};

exports.getWit = getWit;

// bot testing mode
if (require.main === module) {
  console.log("Bot testing mode.");
  const client = getWit();
  client.interactive();
}
