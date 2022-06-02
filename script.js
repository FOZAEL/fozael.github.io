/*
 *  yahiarefaiea-official-website-beta 1.0.0
 *  
 *  I’m a 21 years old handsome guy who grows up in a small town in Syria.
 *  http://beta.yahiarefaiea.com/
 *  hello@yahiarefaiea.com
 *  
 *  Last update on: 2018/10/24
 *  ©2018 Yahia Refaiea. all rights reserved.
 */

$(document).ready(function () {
  var input = $('.field').find('input, textarea');
  input.keyup(function () {
    inputTest(this);
  });
});

function inputTest(that) {
  var field = $(that).closest('.field');
  var form = $(that).closest('form, .form');
  var length = $.trim($(that).val()).length;

  //  FILLED
  if (length > 0) field.addClass('filled');else field.removeClass('filled');

  //  VALIDATED
  if (length >= 4) {
    field.addClass('validated');
    form.addClass('validated');
  } else {
    field.removeClass('validated');
    form.removeClass('validated');
  }
}
var Timer = {
  length: null,
  time: null,
  selector: null,
  interval: null,
  callback: null,

  //  RUN
  run: function (selector, callback, length) {
    Timer.length = length;
    Timer.time = Timer.length;
    Timer.selector = selector;
    Timer.callback = callback;
    $(Timer.selector).text(Timer.length);
    Timer.interval = setInterval(Timer.count, 1000);
  },

  //  COUNT
  count: function () {
    Timer.time = Timer.time - 1;
    $(Timer.selector).text(Timer.time);
    if (Timer.time <= 0) {
      if (typeof Timer.callback === 'function' && Timer.callback) Timer.callback();
      Timer.reset();
    }
  },

  //  RESET
  reset: function () {
    clearInterval(Timer.interval);
    Timer.length = null;
    Timer.time = null;
    Timer.selector = null;
    Timer.interval = null;
    Timer.callback = null;
  }
};
var Identity = {
  duration: 1400,
  delay: 500,
  iteration: 0,
  processing: false,
  enough: false,
  interval: null,
  callback: null,
  status: 'loading',
  id: '#identity',
  selector: '#identity div',
  classes: 'working rest robot',

  //  WORK
  work: function () {
    if (Identity.status != 'loading') Identity.status = 'working';
    Identity.wait(function () {
      $(Identity.id).addClass('working');
    });
  },

  //  ROBOT
  robot: function () {
    Identity.status = 'robot';
    Identity.wait(function () {
      $(Identity.id).addClass('robot');
    });
  },

  //  REST
  rest: function () {
    Identity.abort();
    Identity.status = 'rest';
    setTimeout(function () {
      Identity.abort();
      $(Identity.id).addClass('rest');
    }, Identity.delay);
  },

  //  WAIT
  wait: function (call) {
    if (Identity.processing != true) {
      Identity.abort();
      Identity.processing = true;

      setTimeout(function () {
        if (typeof call === 'function' && call) call();
        Identity.waiting();
        Identity.interval = setInterval(Identity.waiting, Identity.duration);
      }, Identity.delay);
    }
  },

  //  WAITING
  waiting: function () {
    if (Identity.enough != true) {
      ++Identity.iteration;
      return;
    }

    Identity.stopping();
  },

  //  STOP
  stop: function (callback) {
    setTimeout(function () {
      if (Identity.processing == true) {
        Identity.enough = true;
        Identity.callback = callback;

        $(Identity.selector).attr('style', 'animation-iteration-count: ' + Identity.iteration + '; -webkit-animation-iteration-count: ' + Identity.iteration + ';');
      }
    }, Identity.delay);
  },

  //  STOPPING
  stopping: function () {
    clearInterval(Identity.interval);
    Identity.rest();

    if (typeof Identity.callback === 'function' && Identity.callback) Identity.callback();
    Identity.reset();
  },

  //  ABORT
  abort: function () {
    if (Identity.status == 'robot') $(Identity.id).removeClass('robot');else if (Identity.status != 'loading' && Identity.processing != true) $(Identity.id).removeClass(Identity.classes + ' loading');else $(Identity.id).removeClass(Identity.classes);
  },

  //  RESET
  reset: function () {
    Identity.iteration = 0;
    Identity.processing = false;
    Identity.enough = false;
    Identity.interval = null;
    Identity.callback = null;

    $(Identity.selector).removeAttr('style');
  }
};
var Stars = {
  canvas: null,
  context: null,
  circleArray: [],
  colorArray: ['#4c1a22', '#4c1a23', '#5d6268', '#1f2e37', '#474848', '#542619', '#ead8cf', '#4c241f', '#d6b9b1', '#964a47'],

  mouseDistance: 50,
  radius: .5,
  maxRadius: 1.5,

  //  MOUSE
  mouse: {
    x: undefined,
    y: undefined,
    down: false,
    move: false
  },

  //  INIT
  init: function () {
    this.canvas = document.getElementById('stars');
    this.canvas.width = window.innerWidth;
    this.canvas.height = window.innerHeight;
    this.canvas.style.display = 'block';
    this.context = this.canvas.getContext('2d');

    window.addEventListener('mousemove', this.mouseMove);
    window.addEventListener('resize', this.resize);

    this.prepare();
    this.animate();
  },

  //  CIRCLE
  Circle: function (x, y, dx, dy, radius, fill) {
    this.x = x;
    this.y = y;
    this.dx = dx;
    this.dy = dy;
    this.radius = radius;
    this.minRadius = this.radius;

    this.draw = function () {
      Stars.context.beginPath();
      Stars.context.arc(this.x, this.y, this.radius, 0, Math.PI * 2, false);
      Stars.context.fillStyle = fill;
      Stars.context.fill();
    };

    this.update = function () {
      if (this.x + this.radius > Stars.canvas.width || this.x - this.radius < 0) this.dx = -this.dx;
      if (this.y + this.radius > Stars.canvas.height || this.y - this.radius < 0) this.dy = -this.dy;

      this.x += this.dx;
      this.y += this.dy;

      //  INTERACTIVITY
      if (Stars.mouse.x - this.x < Stars.mouseDistance && Stars.mouse.x - this.x > -Stars.mouseDistance && Stars.mouse.y - this.y < Stars.mouseDistance && Stars.mouse.y - this.y > -Stars.mouseDistance) {
        if (this.radius < Stars.maxRadius) this.radius += 1;
      } else if (this.radius > this.minRadius) {
        this.radius -= 1;
      }

      this.draw();
    };
  },

  //  PREPARE
  prepare: function () {
    this.circleArray = [];

    for (var i = 0; i < 1200; i++) {
      var radius = Stars.radius;
      var x = Math.random() * (this.canvas.width - radius * 2) + radius;
      var y = Math.random() * (this.canvas.height - radius * 2) + radius;
      var dx = (Math.random() - 0.5) * 1.5;
      var dy = (Math.random() - 1) * 1.5;
      var fill = this.colorArray[Math.floor(Math.random() * this.colorArray.length)];

      this.circleArray.push(new this.Circle(x, y, dx, dy, radius, fill));
    }
  },

  //  ANIMATE
  animate: function () {
    requestAnimationFrame(Stars.animate);
    Stars.context.clearRect(0, 0, Stars.canvas.width, Stars.canvas.height);

    for (var i = 0; i < Stars.circleArray.length; i++) {
      var circle = Stars.circleArray[i];
      circle.update();
    }
  },

  //  MOUSE MOVE
  mouseMove: function (event) {
    Stars.mouse.x = event.x;
    Stars.mouse.y = event.y;
  },

  //  RESIZE
  resize: function () {
    Stars.canvas.width = window.innerWidth;
    Stars.canvas.height = window.innerHeight;
  }
};
var renderer, scene, camera, ww, wh, particles;

ww = window.innerWidth, wh = window.innerHeight;

var centerVector = new THREE.Vector3(0, 0, 0);
var previousTime = 0;
speed = 10;
isMouseDown = false;

var getImageData = function (image) {

	var canvas = document.createElement("canvas");
	canvas.width = image.width;
	canvas.height = image.height;

	var ctx = canvas.getContext("2d");
	ctx.drawImage(image, 0, 0);

	return ctx.getImageData(0, 0, image.width, image.height);
};

function getPixel(imagedata, x, y) {
	var position = (x + imagedata.width * y) * 4,
	    data = imagedata.data;
	return { r: data[position], g: data[position + 1], b: data[position + 2], a: data[position + 3] };
}

var drawTheMap = function () {

	var geometry = new THREE.Geometry();
	var material = new THREE.PointCloudMaterial();
	material.vertexColors = true;
	material.transparent = true;
	for (var y = 0, y2 = imagedata.height; y < y2; y += 1) {
		for (var x = 0, x2 = imagedata.width; x < x2; x += 1) {
			if (imagedata.data[x * 4 + y * 4 * imagedata.width] > 0) {

				var vertex = new THREE.Vector3();
				vertex.x = x - imagedata.width / 2 + (500 - 440 * .5);
				vertex.y = -y + imagedata.height / 2;
				vertex.z = -Math.random() * 500;

				vertex.speed = Math.random() / speed + 0.015;

				var pixelColor = getPixel(imagedata, x, y);
				var color = "rgb(" + pixelColor.r + ", " + pixelColor.g + ", " + pixelColor.b + ")";
				geometry.colors.push(new THREE.Color(color));
				geometry.vertices.push(vertex);
			}
		}
	}
	particles = new THREE.Points(geometry, material);

	scene.add(particles);

	requestAnimationFrame(render);
};

var init = function () {
	renderer = new THREE.WebGLRenderer({
		canvas: document.getElementById("yahia"),
		antialias: true,
		alpha: true
	});
	renderer.setSize(ww, wh);

	scene = new THREE.Scene();

	camera = new THREE.OrthographicCamera(ww / -2, ww / 2, wh / 2, wh / -2, 1, 1000);
	camera.position.set(0, -20, 4);
	camera.lookAt(centerVector);
	scene.add(camera);
	camera.zoom = 1;
	camera.updateProjectionMatrix();

	imagedata = getImageData(image);
	drawTheMap();

	window.addEventListener('mousemove', onMousemove, false);
	window.addEventListener('mousedown', onMousedown, false);
	window.addEventListener('mouseup', onMouseup, false);
	window.addEventListener('resize', onResize, false);
};
var onResize = function () {
	ww = window.innerWidth;
	wh = window.innerHeight;
	renderer.setSize(ww, wh);
	camera.left = ww / -2;
	camera.right = ww / 2;
	camera.top = wh / 2;
	camera.bottom = wh / -2;
	camera.updateProjectionMatrix();
};

var onMouseup = function () {
	isMouseDown = false;
};
var onMousedown = function (e) {
	isMouseDown = true;
	lastMousePos = { x: e.clientX, y: e.clientY };
};
var onMousemove = function (e) {
	if (isMouseDown) {
		camera.position.x += (e.clientX - lastMousePos.x) / 100;
		camera.position.y -= (e.clientY - lastMousePos.y) / 100;
		camera.lookAt(centerVector);
		lastMousePos = { x: e.clientX, y: e.clientY };
	}
};

var render = function (a) {

	requestAnimationFrame(render);

	particles.geometry.verticesNeedUpdate = true;
	if (!isMouseDown) {
		camera.position.x += (0 - camera.position.x) * 0.06;
		camera.position.y += (0 - camera.position.y) * 0.06;
		camera.lookAt(centerVector);
	}

	renderer.render(scene, camera);
};

var imgData = 'data:image/jpeg;base64,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';

var image = document.createElement("img");
image.src = imgData;
var Submit = {

  //  DATA
  data: function (template, fields) {
    var data = {};
    for (i = 0; i < fields.length; i++) {
      var field = $(fields[i]);
      var name = field.attr('name');
      var value = field.val().replace(/(?:\r\n|\r|\n)/g, '<br>');
      data[name] = value;
    }

    return data;
  },

  //  PUSH
  push: function (form) {
    var template = $('.template[data-template=' + form + ']');
    var fields = template.find('.field input, .field textarea');

    //  WAITING
    Submit.view('[data-status=waiting]', template);

    //  AJAX
    $.ajax({
      type: 'POST',
      url: 'includes/php/' + form + '.php',
      data: { dd: JSON.stringify(Submit.data(template, fields)) },
      dataType: 'json',
      error: function (XMLHttpRequest, textStatus, errorThrown) {
        Submit.callback('error', form, template, fields);
      },
      success: function (data) {
        Submit.callback('success', form, template, fields);
      }
    });
  },

  //  CALLBACK
  callback: function (status, form, template, fields) {
    setTimeout(function () {

      //  SUCCESS
      if (status == 'success') {
        template.find('.form .status').removeClass('current');
        fields.closest('.field').fadeOut(700);
        fields.closest('.form').find('.submit').fadeOut(700);
        Identity.stop();

        if (form == 'secret') secretAvailability = false;else if (form == 'opinion') opinionAvailability = false;

        setTimeout(function () {
          fields.closest('.form').find('.submit').remove();
          fields.closest('.field').remove();
          template.find('.form .status[data-status=success]').addClass('current');
        }, 750);
      }

      //  ERROR
      else {
          Submit.view('[data-status=error]', template);
          setTimeout(function () {
            Submit.view(':not([data-status])', template);
          }, 6000);
        }
    }, 4000);
  },

  //	VIEW
  view: function (selector, template) {
    template.find('.form .status').removeClass('current');
    template.find('.form .status' + selector).addClass('current');
  },

  //	LISTEN
  listen: function (selector) {
    $(selector).on('click', function (e) {
      if ($(this).closest('.form').hasClass('validated')) {
        var form = $(this).attr('data-form');
        Submit.push(form);
      }

      e.preventDefault();
    });
  }
};
var Router = {
	wrapper: [],
	location: null,

	//	ROUTE
	route: function (location, callback) {
		Identity.work();
		Router.location = Router.processLocation(location);

		//	ROUTES
		Router.routes(callback);
	},

	//	PROCESS LOCATION
	processLocation: function (location) {
		if (location === undefined) location = window.location.hash;

		return location.replace('#', '');
	},

	//	CALLBACK
	callback: function (callback) {
		setTimeout(function () {
			Identity.stop();
      Router.updateWrapper();
      Router.updateTemplate(Router.wrapper[0]);
      window.location.hash = Router.location;
      Router.location = null;

      //  CALLBACKS
      Router.callbacks(Router.wrapper[0]);
      if (typeof callback === 'function' && callback) callback();
		}, 200);
	},

	//	UPDATE TEMPLATE
	updateTemplate: function (template) {
		var templates = $('.template');
		var current = $('.template[data-template=' + template + ']');

		templates.removeClass('current');
		setTimeout(function () {
			templates.hide();
			current.show().addClass('current');
		}, 1120);
	},

	//	UPDATE WRAPPER
	updateWrapper: function (push, pull) {
		if (push) Router.push(push);
		if (pull) Router.pull(pull);

		var wrapper = Router.wrapper.toString().replace(/,/g, ' ');
		$('.wrapper').attr('class', 'wrapper ' + wrapper);
	},

	//	PUSH
	push: function (items) {
		items = items.split(' ');

		for (i = 0; i < items.length; i++) {
			if (!Router.wrapper.includes(items[i]) && items[i] != '') Router.wrapper.push(items[i]);
		}
	},

	//	PULL
	pull: function (items) {
		items = items.split(' ');

		for (i = 0; i < items.length; i++) {
			if (Router.wrapper.includes(items[i]) && items[i] != '') Router.wrapper.splice(Router.wrapper.indexOf(items[i]), 1);
		}
	},

	//	LISTEN
	listen: function () {
		$('.wrapper').on('click', '.router', function (e) {
			Router.route($(this).attr('href'), window[$(this).attr('data-callback')]);
			e.preventDefault();
		});

		window.addEventListener('popstate', function (e) {
			Router.route(undefined);
		});
	}
};
Router.routes = function (callback) {
  Router.wrapper = [];
  var location = Router.location.split('/').filter(Boolean);

  //  HOME
  Router.push('home');

  //  CALLBACK
  Router.callback(callback);
};
Router.callbacks = function (wrapper) {
  if (wrapper == 'secret') secret();else if (wrapper == 'opinion') opinion();else if (wrapper == 'bucketAll') bucketAll();else if (wrapper == 'notFound') notFound();
};
var secretAvailability = true;
function secret() {
  if (secretAvailability == true) {
    setTimeout(function () {
      var input = $('.template[data-template=secret] .field').find('input, textarea');

      input.focus();
      Identity.robot();
    }, Identity.duration * 1.25);
  }
}
var opinionAvailability = true;
function opinion() {
  if (opinionAvailability == true) {
    setTimeout(function () {
      var input = $('.template[data-template=opinion] .field').find('input, textarea');

      input.focus();
      Identity.robot();
    }, Identity.duration * 1.25);
  }
}
function bucketAll() {
  var list = $('.template[data-template=bucketAll] .bucketList');
  var link = list.find('li.archived a');

  //  LISTEN
  link.hover(function () {
    list.addClass('hover');
  }, function () {
    list.removeClass('hover');
  });
}
function notFound() {
  setTimeout(function () {
    Timer.run('.template[data-template=notFound] time', function () {
      Router.route('#');
    }, 5);
  }, Identity.duration * 1.25);
}

function notFoundCallback() {
  Timer.reset();
}
var md = new MobileDetect(window.navigator.userAgent);

$(document).ready(function () {
  Identity.work();
  $('.template main').mCustomScrollbar({
    theme: 'dark'
  });
});

function loadProject() {
  Router.route(undefined, function () {

    //  CALLBACK
    Router.listen();
    Submit.listen('.submit');
    if (!md.mobile()) {
      Stars.init();
      init();
    }
    setTimeout(function () {
      $('#signature').removeClass('loading');
    }, Identity.delay * 1.5);
  });
};

loadProject();