/*
 * @Description: 
 * @Author: Era Chen
 * @Email: chenjiyun@corp.netease.com
 * @Date: 2019-08-08 17:41:44
 * @LastEditors  : Lijiawei
 * @LastEditTime : 2022-04-02 13:15:46
 * https://c.runoob.com/front-end/51/
 */
function StepPannel(data, root){
  this.data = data
  this.original_steps = data.steps
  this.steps = [].concat(data.steps)
  this.static = data.static_root
  this.currentStep = 0
  this.currentWrong = -1
  this.pagesize = 20
  this.currentPage = 1
  this.stepLeft = $('#step-left .step-list')
  this.stepRight = $('#step-right')
  this.magnifyContainer = $('#magnify .content')
  this.magnifyPic = $('#magnify')
  this.scale = 0
  this.order = 'acc' // or dec
  this.duration = 'acc' // or dec
  this.status = 'acc' // or dec
  this.thumbnail_step_list = []

  this.init = function(){
    // 初始化
    this.initStepData()
    this.bindEvents()
    this.init_gallery()
    this.init_pagenation()
    var steps = this.filterAssertSteps()
    if(steps.length >0){
      this.steps = steps
      this.filterSteps($('.filter#assert'))
    } else{
      this.setSteps()
    }
    this.init_video()
    if ($('#console pre.trace').length > 0) {
      setTimeout(function(){
        // 当log超过2w行，转换成高亮模式会导致卡顿
        if ($('#console pre.trace').text().length < 20000) {
          hljs.highlightBlock($('#console pre.trace')[0], null, false)
          }
      }, 0)
    }
    this.highlightBlock()
  }

  this.bindEvents = function(){
    // 绑定事件
    var that = this
    this.stepLeft.delegate('.step', 'click',function(e){
      if(e.target.className.indexOf("step-context") >=0 )
        that.jumpToCurrStep(Number(e.target.getAttribute('index')))
      else
        that.setStepRight(e.currentTarget.getAttribute('index'))
    })
    $('.gallery .content').delegate('.thumbnail', 'click', function(e){
      that.jumpToCurrStep(Number(this.getAttribute('index')))
    })
    this.stepRight.delegate('.fancybox', "click", function(e) {
      that.showMagnifyPic(this.outerHTML)
    })
    this.stepRight.delegate('.crop_image', "click", function(e) {
      that.showMagnifyPic(this.outerHTML)
    })
    this.magnifyPic.click(function(e) {
      if (e.target.tagName.toLowerCase() != 'img'){
        that.hideMagnifyPic()
      }
    })
    $('.filter#all').click(function(){
      that.steps = [].concat(that.original_steps)
      that.filterSteps(this)
    })
    $('.filter#success').click(function(){
      that.steps = that.filterSuccessSteps()
      that.filterSteps(this)
    })
    $('.filter#fail').click(function(){
      that.steps = that.filterFailSteps()
      that.filterSteps(this)
    })
    $('.filter#assert').click(function(){
      that.steps = that.filterAssertSteps()
      that.filterSteps(this)
    })
    $('#jump-wrong').click(function(){
      that.steps = [].concat(that.original_steps)
      that.currentWrong = that.findCurrentWrongStep()
      if(that.currentWrong>=0){
        that.currentStep = that.currentWrong
        that.currentPage = Math.ceil(that.currentStep / that.pagesize)
        that.setSteps(that.currentStep)
      }
    })
    $('.order#order').click(function(){
      that.order = that.order == 'acc' ? 'dec' : 'acc'
      that.steps.sort(that.sortSteps('index', that.order == 'acc'))
      that.currentPage = 1
      that.setSteps()
    })
    $('.order#duration').click(function(){
      that.steps.sort(that.sortSteps('duration_ms', that.duration == 'acc'))
      that.duration = that.duration == 'acc' ? 'dec' : 'acc'
      that.currentPage = 1
      that.setSteps()
    })
    $('.order#status').click(function(){
      that.steps.sort(that.sortSteps('status', that.status == 'acc'))
      that.status = that.status == 'acc' ? 'dec' : 'acc'
      that.currentPage = 1
      that.setSteps()
    })
    $("#close-console").click(function(){
      $('#console').fadeOut(300)
    })
    $("#show-console").click(function(){
      $('#console').fadeIn(300)
    })
    document.body.onkeydown= (e)=>{
      e=window.event||e;
      switch(e.keyCode){
        case 37:
          //左键
          this.jumpToPreThumbNail()
          break;
        case 38:
          //向上键
          //禁用触发页面滚动
          e.preventDefault();
          this.jumpToPreThumbNail()
          break;
        case 39:
          //右键
          this.jumpToNextThumbNail()
          break;
        case 40:
          //向下键
          //禁用触发页面滚动
          e.preventDefault();
          this.jumpToNextThumbNail()
          break;
        default:
          break;
      }
    }
  }

  this.sortSteps = function(attr, rev){
    //第二个参数没有传递 默认升序排列
    if(rev ==  undefined){
        rev = 1;
    }else{
        rev = (rev) ? 1 : -1;
    }
    return function(a,b){
        a = a[attr];
        b = b[attr];
        if(a < b){
            return rev * -1;
        }
        if(a > b){
            return rev * 1;
        }
        return 0;
    }
  }

  this.initStepRight = function(){
    // 设置高亮
    this.highlightBlock()
    var that = this
    if($(".step-args .fancybox").length>0){
      $('#step-right .fancybox .screen').load(function(e){
        // 存在截屏，并加载成功
        that.resetScale(this)
        that.convertSize($('.step-args .crop_image'), 80, 35)
        that.resetScreenshot($('#step-right .fancybox'))
      })
    }
  }

  this.highlightBlock = function(){
    if($('#step-right pre.trace').length>0){
      hljs.highlightBlock($('#step-right pre.trace')[0], null, false);
    }
  }

  this.filterSteps = function(dom){
    $('.steps .filter').removeClass('active')
    $(dom).addClass('active')
    this.currentPage = 1
    this.setSteps()
  }

  this.setSteps = function(step){
    // 重设步骤页面内容
    step = step || (this.steps.length > 0 ? this.steps[0].index : 0)
    this.setPagenation()
    this.setStepRight(step)
  }

  this.initStepData = function(){
    for(var i = 0; i< this.steps.length; i++){
      step = this.steps[i]
      if(i == 0){
        step.duration_ms = getDelta(step.time, this.data.run_start)
      } else{
        step.duration_ms = getDelta(step.time, this.steps[i-1].time)
      }
      step.duration = getFormatDuration(step.duration_ms)
      step.index =  i
      step.status =  step.traceback ? 'fail' : 'success'
      this.thumbnail_step_list = this.original_steps.map(function(step){
        if(step.screen && step.screen.thumbnail) {
          return step.index
        }})
        this.thumbnail_step_list = this.thumbnail_step_list.filter((val)=>{
          return val != null
      })
    }
  }

  this.init_gallery = function(){
    var that = this
    var fragment = this.original_steps.map(function(step){
      if(step.screen && step.screen.thumbnail) {
        return '<div class="thumbnail" index="%s">'.format(step.index) +
                  '<img src="%s" alt="%s"/>'.format(step.screen.thumbnail, step.screen.thumbnail) +
                  '<div class="time">%s</div>'.format(getFormatDuration2(getDelta(step.time, that.data.run_start))) +
                '</div>'
      } else{
        return ""
      }
    })
    fragment = fragment.join('')
    if(fragment == ''){
      $('.gallery').hide()
    }else{
      $('.gallery .content').html(fragment)
    }
  }

  this.jumpToCurrStep = function(step) {
    // 跳至指定步骤
    step = step || (this.steps.length > 0 ? this.steps[0].index : 0)
    this.steps = [].concat(this.original_steps)
    this.currentPage = Math.floor(step / this.pagesize) +1
    this.setPagenation()
    this.setStepRight(step)
    $('.steps .filter').removeClass('active')
  }

  this.jumpToNextThumbNail = function() {
    this.jumpToThumbNail('next')
  }

  this.jumpToPreThumbNail = function() {
    this.jumpToThumbNail('pre')
  }

  this.jumpToThumbNail = function(op) {
    let cur_thumbnail_step_index = this.thumbnail_step_list.findIndex((val)=>{
      return val == this.currentStep
    })
    let nxt_thumbnail_step_index = 0

    if(op == 'next'){
      if(cur_thumbnail_step_index < this.thumbnail_step_list.length - 1){
        nxt_thumbnail_step_index = this.thumbnail_step_list[cur_thumbnail_step_index + 1]
      }
    }else if(op == 'pre'){
      if(cur_thumbnail_step_index > 0){
        nxt_thumbnail_step_index = this.thumbnail_step_list[cur_thumbnail_step_index - 1]
      }
    }
    this.currentStep = nxt_thumbnail_step_index
    this.currentPage = Math.ceil(this.currentStep / this.pagesize)
    this.setSteps(this.currentStep)
  }

  this.showMagnifyPic = function(fragment) {
    this.magnifyContainer.html(fragment)
    this.magnifyContainer.children().removeAttr('style')
    var fancybox = this.magnifyContainer.find('.fancybox')
    if (fancybox.length > 0){
      var that = this
      $('#magnify .fancybox .screen').load(function(e){
        // 存在截屏，并加载成功
        if (this.height > this.parentNode.offsetHeight){
          this.style.height = this.parentNode.offsetHeight + 'px'
        }
        that.resetScale(this)
        that.resetScreenshot($('#magnify .fancybox'))
      })
    }
    this.magnifyPic.fadeIn(300)
  }

  this.hideMagnifyPic = function() {
    this.magnifyPic.fadeOut(300)
  }

  this.setStepsLeft = function(){
    html = this.steps.length>0 ? '' : '<h4 class="no-steps"><span lang="en">Warning: No steps</span></h3>'
    var start = (this.currentPage-1)* this.pagesize
    start = start < 0 ? 0 : start
    var end = (this.currentPage)*this.pagesize
    end =  end>this.steps.length ? this.steps.length : end
    for(var i = start; i< end; i++){
      var step = this.steps[i]
      var title = step.assert ? '<span lang="en">Assert: </span>' + step.assert : step.title
      html += '<div class="step" index="%s">'.format(step.index) +
                '<img src="%simage/step_%s.svg" alt="%s.svg"/>'.format(this.static, step.status, step.status) +
                '<span class="order"># %s</span>'.format(step.index +1) +
                '<span class="step_title" lang="en">%s</span>'.format(title) +
                '<span class="step-time">%s</span>'.format(step.duration) +
                '<img class="step-context" src="%simage/eye.svg" alt="eye.svg" index="%s"/>'.format(this.static, step.index) +
              '</div>'
    }
    this.stepLeft.html(html)
  }
  this.setStepRight = function(index){
    index = parseInt(index)
    if(!isNaN(index) && index>= 0 && index<this.original_steps.length){
      $('.gallery .thumbnail.active').removeClass('active')
      $('.gallery .thumbnail[index="%s"]'.format(index)).addClass('active')
      this.setStepRightHtml(index)
      this.initStepRight()
    }
  }

  this.setStepRightHtml = function(index){
    this.stepLeft.find('.step.active').removeClass('active')
    this.stepLeft.find(".step[index='%s']".format(index)).addClass('active')
    step = this.original_steps[index]
    this.currentStep = index
    success = step.traceback ? "fail" : "success"
    pass = step.traceback ? "Failed" : "Passed"
    title = step.code ? step.desc||step.code.name : step.desc
    title = title || step.title
    var head = "<div class='step-head'><span class='step-status %s'>%s</span><span>Step %s: %s</span></div>"
                  .format(success, pass , step.index+1, title)
    var infos = this.getStepRightInfo(step)
    var args = this.getStepRightArgs(step)
    this.stepRight.html(head + infos + args)
  }

  this.getStepRightInfo = function(step){
    // HTML 本步骤成功与否、耗时
    try{
      return ("<div class='step-infos'>"+
                "<div class='infos-li'>" +
                  "<span lang='en'>Status: </span>" +
                  "<span class='content-val %s'>%s</span>" +
                  "<img src='%simage/step_%s.svg'>" +
                "</div>" +
                "<div class='infos-li'>" +
                  "<span lang='en'>Start: </span>" +
                  "<span class='content-val'>%s</span>" +
                "</div>" +
                "<div class='infos-li'>" +
                  "<span lang='en'>Duration: </span>" +
                  "<img src='%simage/time.svg'>" +
                  "<span class='content-val'>%s</span>" +
                "</div>" +
                "<div class='infos-li step-behavior'>" +
                  "<span lang='en'>Behavior: </span>" +
                  "<span class='content-val bold'>%s</span>" +
                "</div>" +
              "</div>").format(success, pass, this.static, success,
                              step.time ? getFormatDateTime(step.time): '--',
                              this.static, step.duration,
                              step.code ? step.code.name:"null")
    } catch (err) {
      console.log(err)
      return ""
    }
  }

  this.getStepRightArgs = function(step) {
    // 操作的参数
    try {
      argHtml = ''
      if (step.code) {
        for (var i = 0; i < step.code.args.length; i++) {
          arg = step.code.args[i]
          if (arg.image) {
            argHtml += ('<img class="crop_image desc" data-width="%s" data-height="%s" src="%s" title="%s">' +
                '<p class="desc">resolution: %s</p>')
                .format(arg.resolution[0], arg.resolution[1], arg.image, arg.image, arg.value.resolution)
          } else {
            val = typeof arg.value == 'object' ? JSON.stringify(arg.value) : arg.value
            argHtml += '<p class="desc">%s: %s</p>'.format(arg.key, val)
          }
        }
      }
    } catch (e) {
      console.error(e)
    }

    // 相似度
    if (step.screen && step.screen.confidence) {
      argHtml += '<p class="desc"><span class="point glyphicon glyphicon-play"></span><span lang="en">Confidence: </span>%s</p>'.format(step.screen.confidence)
    }

    argHtml = argHtml || '<p class="desc">None</p>'
    argHtml = "<div class='fluid infos'>" + argHtml + "</div>"
    argHtml += "<div class='fluid screens'>" + this.getStepRightScreen(step) + "</div>"
    argHtml += "<div class='fluid traces'>" + this.getStepRightTrace(step) + "</div>"
    return "<div class='step-args'><div class='bold'>Args:</div>" + argHtml + "</div>"
  }

  this.getStepRightScreen = function(step){
    if(step.screen && step.screen.src){
      var src = step.screen.src
      // 截屏
      var img = '<img class="screen" data-src="%s" src="%s" title="%s" onerror="hideFancybox(this);">'.format(src, src, src)

      // 点击位置
      var targets = ''
      for(var i=0; i < step.screen.pos.length; i++){
        var pos = step.screen.pos[i]
        var rect = JSON.stringify({'left': pos[0], "top": pos[1]})
        targets += "<img class='target' src='data:image/png;base64,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' rect=%s>"
                  .format(rect)
      }

      // 线
      var vectors = ''
      for(var i=0; i < step.screen.vector.length; i++){
        var v = step.screen.vector[i]
        var rect = JSON.stringify({'left': v[0], "top": v[1]})
        vectors += ("<div class='arrow' data-index='%s' rect=%s>" +
                    '<div class="start"></div>' +
                    '<div class="line"></div>' +
                    '<div class="end"></div>' +
                  '</div>').format(this.currentStep, rect)
      }

      // 还有个rect <!-- rect area -->
      var rectors = ''
      for(var i=0;i<step.screen.rect.length; i++){
        var rect = step.screen.rect[i]
        rectors += "<div class='rect' rect='%s' ></div>"
                   .format(JSON.stringify(rect))
      }
      var res = step.screen.resolution
      res = res ? 'w=%s h=%s'.format(res[0], res[1]): ""

      return '<div class="fancybox" %s >%s</div>'.format(res, img + targets + vectors + rectors)
    } else{
      return ""
    }
  }

  this.getStepRightTrace = function(step){
    if(step.traceback || step.log){
      var logMessage = step.traceback || '' + step.log || '';
      return '<div class="bold">Logs:</div><div class="desc"><pre class="trace"><code class="python">%s</code></pre></div>'.format(logMessage)
    } else{
      return ""
    }
  }

  this.resetScale = function(dom){
    /**
     * @description: 重新计算截屏缩放的比例
     * @param {dom} dom img对象
     */
    imgWidth = dom.parentNode.getAttribute('w') || dom.naturalWidth
    dwidth = dom.width
    this.scale = dwidth / imgWidth
  }

  this.resetScreenshot = function(fancybox){
    // 重新设置targt、方框、连接线位置
    var screen = fancybox.find('.screen')
    this.convertPos(fancybox.find('.target'), screen, true)
    this.convertSize(fancybox.find('.rect'))
    this.convertPos(fancybox.find('.rect'), screen)
    this.showArrow(fancybox.find(".arrow"), screen)
    fancybox.css({
      'width': screen.width()
    })
  }

  this.convertPos = function(domList, screen,  withSize){
    for(var i=0; i<domList.length; i++){
      var rect = JSON.parse(domList[i].getAttribute('rect'))
      x = rect.left * this.scale
      y = rect.top * this.scale
      if(withSize){
        x -= domList[i].offsetWidth/2
        y -= domList[i].offsetHeight/2
      }
      domList[i].style.left = this.convertPosPersentage(x, screen , 'horizontal')
      domList[i].style.top = this.convertPosPersentage(y, screen, 'vertical')
    }
  }

  this.convertSize = function(domList, minWidth, minHeight) {
    for(var i=0;i<domList.length; i++){
      if (domList[i].tagName.toLowerCase() == 'img'){
        w = domList[i].clientWidth
        h = domList[i].clientHeight
      } else{
        var rect = JSON.parse(domList[i].getAttribute('rect'))
        w = rect.width
        h = rect.height
      }
      var scale = Math.max(this.scale, (minWidth || 0)/w, (minHeight || 0)/h)
      domList[i].style.width = (w * scale) + 'px'
      domList[i].style.height = (h * scale) + 'px'
    }
  }

  this.showArrow = function(dom, screen){
    var start = this.original_steps[this.currentStep].screen.pos[0]
    var vector = this.original_steps[this.currentStep].screen.vector[0]
    if(vector && start){
      var vt_x = vector[0] * this.scale;
      var vt_y = - vector[1] * this.scale;
      var vt_width = Math.sqrt(vt_x * vt_x + vt_y * vt_y)
      var rotation = 360*Math.atan2(vt_y, vt_x)/(2*Math.PI)
      var rt =  'rotate(' + -rotation + 'deg)';
      var rotate_css = {
        '-ms-transform': rt,
        '-webkit-transform': rt,
        '-moz-transform': rt,
        'transform': rt,
        'transform-origin': '6px 15px',
      };
      dom.css(rotate_css);
      dom.css({
        'top': this.convertPosPersentage(start[1]* this.scale, screen, 'vertical'),
        'left': this.convertPosPersentage(start[0]*this.scale, screen, 'horizontal'),
        'width': vt_width
      });
    }
  }

  this.filterSuccessSteps = function(){
    // 筛选成功步骤
    arr = []
    for(var i=0; i<this.original_steps.length; i++){
      step = this.original_steps[i]
      if(step.traceback)
        continue
      else
        arr.push(step)
    }
    return arr
  }

  this.filterFailSteps = function(){
    // 筛选失败步骤
    arr = []
    for(var i=0; i<this.original_steps.length; i++){
      step = this.original_steps[i]
      if(step.traceback)
        arr.push(step)
      else
        continue
    }
    return arr
  }

  this.filterAssertSteps = function(){
    // 筛选断言步骤
    arr = []
    for(var i=0; i<this.original_steps.length; i++){
      step = this.original_steps[i]
      if(step.assert)
        arr.push(step)
      else
        continue
    }
    return arr
  }

  this.findCurrentWrongStep = function(){
    // 跳至错误步骤
    arr = this.filterFailSteps()
    if(arr.length>0){
      if(this.currentWrong == arr[arr.length-1].index)
        return arr[0].index
      for(var i=0; i<arr.length; i++){
        if(arr[i].index > this.currentWrong)
          return arr[i].index
      }
    }
    return -1
  }

  this.init_pagenation = function(){
    //生成分页控件
    this.paging = new Paging();
    var that = this
    var list_len = this.steps.length
    this.paging.init({
      target:'#pageTool',
      pagesize: this.pagesize,
      count: this.steps.length,
      prevTpl: "<",
      nextTpl: ">",
      toolbar:true,
      pageSizeList: list_len>100 ? [10, 20, 50, 100, list_len] : [10, 20, 50, 100],
      changePagesize:function(ps){
        that.pagesize = parseInt(ps)
        that.currentPage = 1
        that.setStepsLeft()
      },
      callback:function(p){
        that.currentPage = parseInt(p)
        that.setStepsLeft()
      }
    });
    $('#pageTool').prepend('<span class="steps-total"><span lang="en">Total </span><span class="steps-account"></span></span>')
  }

  this.setPagenation = function(){
    if(this.steps.length > this.pagesize)
      $('#pageTool').show()
    else
      $('#pageTool').hide()
    this.paging.render({
      'count': this.steps.length
    })
    $('#pageTool .steps-account').html(this.steps.length)
    this.paging.go(this.currentPage)
  }

  this.init_video = function(){
    var container = $('.gif-wrap')
    if($('.gif-wrap .embed-responsive').length>0) {
      $('.gif-wrap .minimize').click(function(){
        container.removeClass('show')
      })
      $('.gif-wrap .maximize').click(function(){
        container.addClass('show')
      })
      $('.gif-wrap .close').click(function(){
        container.hide()
      })
    }else {
      container.hide()
    }
  }

  this.convertPosPersentage = function(pixcel, screen, key){
    ret = ''
    if(key == 'horizontal'){
      ret = pixcel / screen.width() * 100 + '%'
    }
    else if (key == 'vertical'){
      ret = pixcel / screen.height() * 100 + '%'
    }
    return ret
  }
}


String.prototype.format=function(){
  var args = Array.prototype.slice.call(arguments);
  var count=0;
  return this.replace(/%s/g,function(s,i){
    return args[count++];
  });
}

Date.prototype.Format = function (fmt) { //author: meizz
  var o = {
    "M+": this.getMonth() + 1, //月份
    "d+": this.getDate(), //日
    "h+": this.getHours(), //小时
    "m+": this.getMinutes(), //分
    "s+": this.getSeconds(), //秒
    "q+": Math.floor((this.getMonth() + 3) / 3), //季度
    "S": this.getMilliseconds() //毫秒
  };
  if (/(y+)/.test(fmt)) fmt = fmt.replace(RegExp.$1, (this.getFullYear() + "").substr(4 - RegExp.$1.length));
  for (var k in o)
  if (new RegExp("(" + k + ")").test(fmt)) fmt = fmt.replace(RegExp.$1, (RegExp.$1.length == 1) ? (o[k]) : (("00" + o[k]).substr(("" + o[k]).length)));
  return fmt;
}

function getFormatDateTime(timestamp){
  timestamp = getTimestamp(timestamp)
  return (new Date(timestamp)).Format("yyyy-MM-dd hh:mm:ss")
}

function getFormatDate(timestamp){
  timestamp = getTimestamp(timestamp)
  return (new Date(timestamp)).Format("yyyy / MM / dd")
}

function getFormatTime(timestamp){
  timestamp = getTimestamp(timestamp)
  return (new Date(timestamp)).Format("hh:mm:ss")
}

function getFormatDuration(delta) {
  // 格式化耗时， 格式为 0hr1min6s22ms
  ms = parseInt(delta % 1000)
  delta = parseInt(delta / 1000)
  s = delta % 60
  delta = parseInt(delta/ 60)
  m = delta % 60
  h = parseInt(delta/ 60)

  msg = ''
  if(h == 0)
    if(m == 0)
      if(s==0)
        msg =  ms + "ms"
      else
        msg = s + "s " + ms + "ms"
    else
      msg = m + 'min ' + s + "s " + ms + "ms"
  else
    msg = h + 'hr ' + m + 'min ' + s + "s " + ms + "ms"
  return msg
}

function getFormatDuration2(delta) {
  // 返回耗时，格式为 00:00:19
  var midnight = (new Date(new Date().setHours(0, 0, 0, 0))).getTime()
  return (new Date(midnight + delta)).Format("hh:mm:ss")
}

function getDelta(end, start) {
  // 返回耗时 单位为毫秒, end 和 start 可能是timestamp，也可能是化数据
  return getTimestamp(end) - getTimestamp(start)
}

function getTimestamp(time) {
  // time有可能是时间戳，也可能是格式化的，返回为毫秒
  if(Number(time)){
    return Number(time) * 1000
  } else{
    return (new Date(time).getTime())
  }
}

function toggleCollapse(dom){
  if(dom.hasClass('collapse')){
    dom.removeClass('collapse')
  } else{
    dom.addClass('collapse')
  }
}

function urlArgs(){
  var args = {};
  var query = location.search.substring(1);
  var pairs = query.split(/&|\?/);
  for(var i = 0;i < pairs.length; i++){
      var pos = pairs[i].indexOf("=");
      if(pos == -1) continue;
      var name = pairs[i].substring(0, pos);
      var value = pairs[i].substring(pos + 1);
      value = decodeURIComponent(value);
      args[name] = value;
  }
  // Connect :Android:///04157df490cb0b3f?cap_method=JAVACAP&&ori_method=ADBORI&&touch_method=ADBTOUCH
  // && 也会被分割
  if(args['connect']){
    var methods = []
    if(args['cap_method'])
      methods.push("cap_method=JAVACAP")
    if(args['ori_method'])
      methods.push("ori_method=ADBORI")
    if(args['touch_method'])
      methods.push("touch_method=ADBTOUCH")
    if(methods.length>0)
      args['connect'] = args['connect'] + '?' + methods.join('&&')
  }
  return args;
}


var formatStr = function(str) {
  return (str.charAt(0).toUpperCase()+str.slice(1)).replace(/_/g, ' ') + ':'
};

function loadUrlInfo(){
  // 根据search信息，在summary下面插入设备信息，仅限多机运行的时候使用
  args = urlArgs()
  result = data.test_result ? 'Passed' : 'Failed'
  if(args.type) {
    var container = $('#device')
    container.addClass('show')
    var keys = ["device", "connect", "accomplished", "rate", "succeed", 'failed', "no_of_device", "no_of_script", "type"]
    args.rate = (args.succeed / args.accomplished * 100).toFixed(2) + '%'
    args.failed = args.accomplished - args.succeed
    args['no_of_device'] = args.device_no
    args['no_of_script'] = args.script_no
    var fragment  = keys.map(function(k){
      return '<div class="info %s" title="%s"><span lang="en">%s</span>%s</div>'.format(k,args[k], formatStr(k), args[k])
    })
    back = '<a href="%s#detail" class="back" title="Back to multi-device report"><img src="%simage/back.svg"></a>'.format(args.back, data.static_root)
    $('#back_multi').html(back)
    container.html(fragment)
    result = args.status ? args.status : result
    $(".footer").hide()
  }
  set_task_status(result)
  $('.info.connect').append("<div class='copy_device'></div>")
  $(".info .copy_device").click(function(){
    copyToClipboard(this.parentNode.getAttribute('title'))
  })
}

function copyToClipboard(msg){
  const input = document.createElement('input')
  input.setAttribute('readonly', 'readonly');
  input.setAttribute('value', msg);
  document.body.appendChild(input);
  if (document.execCommand('copy')) {
    input.select();
    document.execCommand('copy');
    console.log('复制成功');
  } else{
    alert('Copy is not supported by the current browser, please change to chrome')
  }
  document.body.removeChild(input);
}

function set_task_status(result){
  src = "%simage/%s.svg".format(data.static_root, result=='Passed' ? 'success' : 'fail')
  $('.summary #result-img').attr('src', src)
  $('.summary #result-img').attr('alt', result)
  $('.summary #result-desc').addClass(result=='Passed' ? 'green' : 'red')
  $('.summary #result-desc').html("[%s]".format(result))
}

function init_page(){
  $('.summary .info-sub.start').html(getFormatDate(data.run_start))
  $('.summary .info-sub.time').html(getFormatTime(data.run_start) + '-' + getFormatTime(data.run_end))
  $('.summary .info-value.duration').html(getFormatDuration(getDelta(data.run_end, data.run_start)))
  setImgAffix()
}

function hideFancybox(img) {
  // 图片加载失败的情况下，隐藏整个div
  $(img).parent().hide();
}

function setImgAffix(){
  // 延迟触发，等待其他元素渲染完成再去获取，否则获取的值有误
  setTimeout(() => {
  // 获取页面加载时快览与页面顶端的距离
  var stickyHeaderTop = $('.gallery .content').offset().top
  // 在快览滑动到顶端时将其设置为固钉，添加页面滚动的监听事件
  $(window).scroll(function(){
    if($(window).scrollTop() > stickyHeaderTop) {
            $('.gallery .content').css({position: 'fixed', top: '0px'})
    } else {
            $('.gallery .content').css({position: 'relative', top: '0px'})
    }
  })
    // 计算需要占位的高度
    var placeHolderHeight= $('.gallery .placeholder').height()
    var placeHolderWidth = $('.gallery .content').width()
    $('.gallery .placeholder').css({minHeight: placeHolderHeight})
    $('.gallery .content').css({maxWidth: placeHolderWidth})
  }, 500)
}

$(function(){
  init_page()
  stepPanel = new StepPannel(data)
  stepPanel.init()
  $("img").error(function () {
    var orsrc = $(this).attr("src")
    if(!orsrc){ return }
    if(orsrc.indexOf("report.gif") > -1){
      setTimeout(function(){
        $(this).attr("src", 'report.gif?timestamp=' + new Date().getTime());
      }.bind(this), 5000)
      return
    }
    $(this).unbind("error")
    .addClass('error-img')
    .attr("src", data.static_root + "image/broken.png")
    .attr("orgin-src", orsrc);
  });

  // 延迟加载图片
  lazyload();

  // 自动收缩过长的脚本描述
  var descHeight = 100;
  descWrap = $('.summary .airdesc')
  if($('.summary .desc-content').height()>descHeight) {
    descWrap.addClass('long collapse')
    $(".summary .show-more").click(function(){
      toggleCollapse(descWrap)
    })
  }

  // 复制脚本地址到粘贴版
  $('.copy-img').click(function(){
    copyToClipboard(this.getAttribute('data-value'))
  })

  // 从地址search部分加载设备信息等
  loadUrlInfo()
})