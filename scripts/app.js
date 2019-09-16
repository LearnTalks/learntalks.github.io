define([
  'jquery',
  'util',
  'valine',
  'algoliasearch',
  'registerSW',
  'fancybox',
  'confirm',
  'iconfont',
  'share',
  'search'
], function($, util, valine, algoliasearch) {
  'use strict'

  // valine评论
  var API_ID = (THEME_CONFIG.valine && THEME_CONFIG.valine.API_ID) || ''
  var API_KEY = (THEME_CONFIG.valine && THEME_CONFIG.valine.API_KEY) || ''
  if (API_ID && API_KEY) {
    new valine({
      el: '#comment',
      appId: THEME_CONFIG.valine.API_ID,
      appKey: THEME_CONFIG.valine.API_KEY,
      notify: false,
      visitor: true, // 阅读量统计
      recordIP: true,
      avatar: 'mp',
      placeholder: '骑士很煎蛋、骑士很孜然'
    })
  }

  // 畅言
  var appid = (THEME_CONFIG.changyan && THEME_CONFIG.changyan.appid) || ''
  var conf = (THEME_CONFIG.changyan && THEME_CONFIG.changyan.conf) || ''
  if (appid && conf) {
    var width = window.innerWidth || document.documentElement.clientWidth
    if (width < 960) {
      window.document.write(
        '<script id="changyan_mobile_js" charset="utf-8" type="text/javascript" src="https://changyan.sohu.com/upload/mobile/wap-js/changyan_mobile.js?client_id=' +
          appid +
          '&conf=' +
          conf +
          '"></script>'
      )
    } else {
      loadJs('https://changyan.sohu.com/upload/changyan.js', false, function() {
        window.changyan.api.config({ appid: appid, conf: conf })
      })
    }
  }

  // 阻止冒泡
  function stopPropagation(e) {
    e.stopPropagation ? e.stopPropagation() : (e.cancelBubble = true)
  }

  var IMG_ARRAY = {
    xue: 'daxue',
    lei: 'leidian',
    shachen: 'shachenbao',
    wu: 'wu',
    bingbao: 'bingbao',
    yun: 'duoyun',
    yu: 'dayu',
    yin: 'yintian',
    qing: 'qingtian'
  }

  // bind events
  $(document).ready(function() {
    util.WEATH.getWeath().then(resp => {
      if (resp) {
        var city_name = resp.city || '上海' // 默认上海
        var today = (resp.data && resp.data[0]) || {}
        var wea_img = today.wea_img || 'qingtian' // 默认晴天图标
        var wea = today.wea // 当前天气
        var tem = today.tem // 当前温度

        $('#city-name').text(city_name)
        $('#weather-detail').text((wea || tem) && `${wea}/${tem}`)
        $('#weather-img').html(
          `<svg class="icon weather" aria-hidden="true">
            <use xlink:href="#icon-${IMG_ARRAY[wea_img] || 'qingtian'}"></use>
        </svg>`
        )
      }
    })

    // 图片预览
    $('.post-entry > img').each(function(k, v) {
      var src = $(v)[0].src
      var title = $(v)[0].title
      $(v).after(
        `<a href="${src}" data-caption="${title}" data-fancybox="images"><img src="${src}" alt="${title}"></a>`
      )
      $(v).remove()
    })
    $('[data-fancybox="images"]').fancybox({
      loop: true // 相册循环浏览
    })

    // side菜单
    $(document).on('click', '.toggle-icon', function() {
      $('#side').hasClass('active')
        ? $('#side').removeClass('active')
        : $('#side').addClass('active')
    })

    // 分享
    $(document).on('click', '.share', function(e) {
      var that = $(this)
      $().share({
        url: `${location.origin}${that.data('url')}` || location.href,
        sites: THEME_CONFIG.share
      })
      stopPropagation(e)
    })

    // 咖啡
    $(document).on('click', '#reward-button', function(e) {
      $('#qr').toggle('1000')
    })

    // 顶部滚动进度条
    $(window).scroll(function(e) {
      var pageHeight = document.documentElement.scrollHeight || document.body.scrollHeight // 页面总高度
      var windowHeight = document.documentElement.clientHeight || document.body.clientHeight // 浏览器视口高度
      var scrollAvail = pageHeight - windowHeight // 可滚动的高度
      var scrollTop = document.documentElement.scrollTop || document.body.scrollTop // 获取滚动条的高度
      var ratio = (scrollTop / scrollAvail) * 100 + '%'
      $('#progress > .line').css('width', ratio)
    })

    var mousewheel = function(e) {
      e = e || window.event

      //判断浏览器IE，谷歌滑轮事件
      if (e.wheelDelta) {
        //当滑轮向上滚动时
        if (e.wheelDelta > 0) {
          $('#side').removeClass('active')
        }

        //当滑轮向下滚动时
        if (e.wheelDelta < 0) {
          $('#side').addClass('active')
        }
      }
      //Firefox滑轮事件
      else if (e.detail) {
        //当滑轮向上滚动时
        if (e.detail > 0) {
          $('#side').removeClass('active')
        }

        //当滑轮向下滚动时
        if (e.detail < 0) {
          $('#side').addClass('active')
        }
      }
    }

    document.addEventListener && document.addEventListener('DOMMouseScroll', mousewheel, false) //firefox
    window.onmousewheel = document.onmousewheel = mousewheel //滚动滑轮触发scrollFunc方法  //ie 谷歌

    // fiexed menu
    $(document).on('click', '#fixed-menu', function() {
      window.scrollTo({
        top: 0,
        behavior: 'smooth'
      })
    })

    // pjax
    if ($.support.pjax) {
      $(document).on('click', 'a[data-pjax]', function(event) {
        var container = $(this).closest('[data-pjax-container]')
        var containerSelector = '#' + container.id
        $.pjax.click(event, { container: containerSelector })
      })
    }

    // algoliasearch
    if (algoliasearch && THEME_CONFIG.algoliasearch) {
      const client = algoliasearch(
        THEME_CONFIG.algoliasearch.applicationID,
        THEME_CONFIG.algoliasearch.apiKey
      )
      const index = client.initIndex(THEME_CONFIG.algoliasearch.indexName)

      // only query string
      // index.search(
      //   {
      //     query: '倒影'
      //   },
      //   (err, { hits } = {}) => {
      //     if (err) throw err

      //     console.log(hits)
      //   }
      // )
    }

    // animateCSS
    function animateCSS(element, animationName, callback) {
      const node = document.querySelector(element)
      node.classList.add('animated', animationName)

      function handleAnimationEnd() {
        node.classList.remove('animated', animationName)
        node.removeEventListener('animationend', handleAnimationEnd)

        if (typeof callback === 'function') callback()
      }

      node.addEventListener('animationend', handleAnimationEnd)
    }
  })
})
