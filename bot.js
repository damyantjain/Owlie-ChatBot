'use strict';

const Wit = require('node-wit').Wit;
const FB = require('./facebook.js');
const Config = require('./const.js');
const {searchItem} = require('./util/amazon_api_util.js');
const JsonUtil = require('./util/json_util.js');
const Reminder = require('./models/reminder');


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
    console.log("in say");
    console.log(context);
    console.log(response);
    console.log(response.includes("Got Cha!"));

    // Bot testing mode
    if (require.main === module) {
      cb();
      return;
    }

    // Our bot has something to say!
    const recipientId = context._fbid_;
    if (recipientId) {

      let data = null;

      if (response.includes("Got Cha!") || context.reminder === "Got Cha!") {
        const newReminder = {
            user_id: recipientId,
            value: context.giftRecipient,
            expiration: context.datetime
        };
        console.log(newReminder);

        Reminder.create(newReminder, err => {
          console.log(err);
        });
      }

      if (context.gift) {
        if (JsonUtil.isJsonString(response)) {
          data = JSON.parse(response);
        } else {
          data = {"text": response};
        }
        FB.fbMessage(recipientId, data, (err, data) => {
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
        setTimeout(() => FB.fbMessage(recipientId,
          {
            "text":"Here are more options...",
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
          }), 10000)
      } else {
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
      }
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
    const datetime = firstEntityValue(entities, 'datetime');
    if (giftRecipient) {
      context.giftRecipient = giftRecipient;
    }
    if (giftType) {
      context.giftType = giftType;
      context.itemPage = 1;
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
    if (datetime) {
      context.datetime = datetime;
    }
    cb(context);
  },

  // ['incrementItemPage'](sessionId, context, cb) {
  //   console.log("Inside incrementItemPage function ....");
  //   context.itemPage += 1;
  //   console.log(context);
  //
  //   console.log("ending incrementItemPage.. ");
  // },

  error(sessionId, context, error) {
    console.log(error.message);
  },

  //bot executes
  ['getGift'](sessionId, context, cb) {
    context.minimumPrice = "5000";
    context.maximumPrice = "10000";

    searchItem(context.giftType, context.itemPage, context.minimumPrice, context.maximumPrice)
      .then(response => {
        let cards = [];
        let filters = {};
        let nodeName;
        let nodeId;

        let title;
        let price;
        let availability;
        let imageUrl;
        let url;
        let shipping;
        let eligiblePrime;

        for (let i = 0; i < response.length; i++) {
          nodeName = response[i]["BrowseNodes"][0]["BrowseNode"][0]["Name"][0];
          nodeId = response[i]["BrowseNodes"][0]["BrowseNode"][0]["BrowseNodeId"][0];
          filters[nodeName] = nodeId;

          title = response[i];
          if (!!title["ItemAttributes"][0]["Title"]) {
            title = title["ItemAttributes"][0]["Title"][0];
          } else {
            title = "";
          }

          price = response[i];
          if (!!price["OfferSummary"][0]["LowestNewPrice"][0]["FormattedPrice"]) {
            price = price["OfferSummary"][0]["LowestNewPrice"][0]["FormattedPrice"][0];
          } else {
            price = "";
          }

          availability = response[i];
          if (!!availability["Offers"][0]["Offer"][0]["OfferListing"][0]["Availability"]) {
            availability = availability["Offers"][0]["Offer"][0]["OfferListing"][0]["Availability"][0];
          } else {
            availability = "";
          }

          imageUrl = response[i];
          if (!!imageUrl["LargeImage"][0]["URL"]) {
            imageUrl = imageUrl["LargeImage"][0]["URL"][0];
          } else {
            imageUrl = "http://res.cloudinary.com/d239j12/image/upload/v1491707637/noimagefound_vcaxfn.jpg";
          }

          url = response[i];
          if (!!url["DetailPageURL"]) {
            url = url["DetailPageURL"][0];
          } else {
            url = "http://www.amazon.com";
          }

          shipping = response[i];
          if (!!shipping["Offers"][0]["Offer"][0]["OfferListing"][0]["Availability"]) {
            shipping = shipping["Offers"][0]["Offer"][0]["OfferListing"][0]["Availability"][0];
          } else {
            shipping = "";
          }

          eligiblePrime = response[i];
          if (!!eligiblePrime["Offers"][0]["Offer"][0]["OfferListing"][0]["IsEligibleForPrime"]) {
            eligiblePrime = eligiblePrime["Offers"][0]["Offer"][0]["OfferListing"][0]["IsEligibleForPrime"][0];
            if (eligiblePrime === '1') {
              eligiblePrime = '✅ Eligible for Prime';
            } else {
              eligiblePrime = '❎ No shipping info on Prime';
            }
          } else {
            eligiblePrime = '❎ No shipping info on Prime';
          }

          cards.push( {
            "title": title,
            "subtitle": `${price}\n${availability}`,
            "image_url": imageUrl,
            "buttons": [
              {
                "type": "web_url",
                "url": url,
                "title": "🛍 Details & Buy"
              }, {
                "type": "web_url",
                "url": url,
                "title": eligiblePrime
              }
            ],
          });
        }

        let options = Object.keys(filters);
        context.filterOptions = options.join(",");

        let template = JSON.stringify({
          "attachment": {
            "type": "template",
            "payload": {
              "template_type": "generic",
              "elements": cards
            }
          }
        });

        context.gift = template;
      });
    cb(context);
  },

  ['showButtons'](sessionId, context, cb) {
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


  ['clearContext'](sessionId, context, cb) {
    console.log(context);
    context.new_search = JSON.stringify({"attachment":{
        "type":"template",
        "payload":{
          "template_type":"button",
          "text":"What would you like to do?",
          "buttons":[
            {
              "type":"postback",
              "title":"🎁  Buy gift",
              "payload":"USER_BUY_GIFT"
            },
            {
              "type":"postback",
              "title":"⏰  Set gift reminder",
              "payload":"USER_REMINDER"
            },
            {
              "type":"postback",
              "title":"😭  Help",
              "payload":"USER_HELP"
            }
          ]
        }
      }
    });
    cb(context);
  },

  ['setReminder'](sessionId, context, cb) {
    context.reminder = "Got Cha!";
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
