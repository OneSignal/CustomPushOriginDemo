function log() {
  var args = Array.prototype.slice.call(arguments);
  args.unshift(location.href + ':');
  console.log.apply(console, args);
}

function createHiddenDomIframe(url, name) {
  var node = document.createElement("iframe");
  node.style.display = "none";
  if (!url) {
    url = 'about:blank';
  }
  node.src = url;
  if (name) {
    node.name = name;
  }
  document.body.appendChild(node);
  return node;
}

function openPopup(url) {
  var dualScreenLeft = window.screenLeft != undefined ? window.screenLeft : screen.left;
  var dualScreenTop = window.screenTop != undefined ? window.screenTop : screen.top;
  var thisWidth = window.innerWidth ? window.innerWidth : document.documentElement.clientWidth ? document.documentElement.clientWidth : screen.width;
  var thisHeight = window.innerHeight ? window.innerHeight : document.documentElement.clientHeight ? document.documentElement.clientHeight : screen.height;
  var childWidth = OneSignal._windowWidth;
  var childHeight = OneSignal._windowHeight;
  var left = ((thisWidth / 2) - (childWidth / 2)) + dualScreenLeft;
  var top = ((thisHeight / 2) - (childHeight / 2)) + dualScreenTop;
  window.open(url, "yoursite-http-popup", 'scrollbars=yes, width=' + childWidth + ', height=' + childHeight + ', top=' + top + ', left=' + left);
}

function loadIframeAndSubscriptionStates() {
  var isSubscribedToOneSignal = false;
  var oneSignalUserId = null;
  var savedTags = null;

  var iframeUrl = 'https://onesignal.github.io/CustomPushOriginSubdomainDemo/iframe.html';
  var popupUrl = 'https://onesignal.github.io/CustomPushOriginSubdomainDemo/subscribe.html?origin=' + location.origin;
  var iframeOrigin = new URL(iframeUrl).origin;
  var iframe = createHiddenDomIframe(iframeUrl);
  iframe.onload = function() {
    log('iFrame @ ' + iframe.src + ' finished loading.');

    // Ask our iframe whether the user is subscribed,  the saved tags
    // OneSignal has stored for this user, and the user's OneSignal user ID,
    // which only exists if the user is successfully subscribed
    iframe.contentWindow.postMessage({
      command: 'query'
    }, iframeOrigin);

    function receiveMessage(event) {
      // Do we trust the sender of this message?  (might be
      // different from what we originally opened, for example).

      // TODO: Eventually implement this!
      // if (event.origin !== "https://push.yoursite.com/iframe") // return;

      if (event.data.command === 'reply') {
        var results = event.data.extra;
        isSubscribedToOneSignal = results[0];
        savedTags = results[1];
        oneSignalUserId = results[2];

        // Dispatch the done event
        window.dispatchEvent(new CustomEvent('iframeinitialize', {
          detail: {
            subscribed: results[0],
            savedTags: results[1],
            oneSignalUserId: results[2]
          }}));

      } else if (event.data.command === 'doneSubscribing') {
        log('Got message from popup that user has finished subscribing. Registered user ID:', event.data.extra.userId);
        showHideContent(true);
        document.querySelector('#my-user-id').textContent = event.data.extra.userId;
      }
    }

    window.addEventListener("message", receiveMessage, false);


    // After the iframe has sent us the user's subscription state, saved tags, and user ID
    // We can decide how to prompt the user
    window.addEventListener('iframeinitialize', function(e) {
      showHideContent(e.detail.subscribed);
      if (!e.detail.subscribed) {
        document.querySelector('#button-subscribe').addEventListener('click', function () {
          log('Clicked subscribe button.');
          if (!isSubscribedToOneSignal) {
            log("Because the user isn't subscribed to notifications, we're going to open a popup window" +
              " to subscribe the user.");
            /*
             Because the user isn't subscribed to push notifications on https://push.yoursite.com,
             we have to actually subscribe the user first before doing anything else.
             */
            openPopup(popupUrl);
          } else {
            log("Because the user is already subscribed to notifications, we're going to virtually " +
              "subscribe him to this site by setting a tag on his user data.");
            /*
             The user is already "actually" subscribed to push notifications. We can just set a tag on
             their user record to say they are also subscribed to this specific site.

             We should postmessage this command to the iframe, since the iframe can easily set a tag
             on the user, taking advantage of the methods available on the web SDK.
             */
            iframe.contentWindow.postMessage({
                command: 'subscribe',
                extra: {
                  origin: location.origin
                }
              },
              iframeOrigin);
          }
        });
      } else {
        document.querySelector('#my-user-id').textContent = e.detail.oneSignalUserId;
      }
    }, false);

  };
}

function showHideContent(isSubscribed) {
  if (isSubscribed) {
    var elements = document.querySelectorAll('.show-when-subscribed');
    elements.forEach(function (element) {
      element.classList.remove("hidden");
    });
    var elements = document.querySelectorAll('.show-when-unsubscribed');
    elements.forEach(function (element) {
      element.classList.add("hidden");
    });
    var elements = document.querySelectorAll('.show-when-subscribed-and-opted-out');
    elements.forEach(function (element) {
      element.classList.add("hidden");
    });
  } else {
    var elements = document.querySelectorAll('.show-when-unsubscribed');
    elements.forEach(function (element) {
      element.classList.remove("hidden");
    });
    var elements = document.querySelectorAll('.show-when-subscribed');
    elements.forEach(function (element) {
      element.classList.add("hidden");
    });
    var elements = document.querySelectorAll('.show-when-subscribed-and-opted-out');
    elements.forEach(function (element) {
      element.classList.add("hidden");
    });
  }
}

log('Host page loaded and script running.');
loadIframeAndSubscriptionStates();