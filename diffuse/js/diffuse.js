var Diffuse = function(container, shaders){
  this.container = container;
  this.width = container.width;
  this.height = container.height;

  // for handling events
  this.mouseDown = false;

  // shaders
  this.shaders = shaders;

  // renderer
  this.renderer = new THREE.WebGLRenderer({
    canvas: container,
    preserveDrawingBuffer: true
  });
  this.renderer.setClearColor(0xa0a0a0);
  this.renderer.setSize(this.width, this.height);

  // scene
  this.scene = new THREE.Scene();

  // camera
  this.camera = new THREE.OrthographicCamera(-0.5*this.width, 0.5*this.width,
    0.5*this.height,-0.5*this.height, -500, 1000);

  // simulation properties
  this.simulation = {
    nx: undefined,
    ny: undefined,
    toggleBuffer1: false,
    speed : 1,
    paused: false,

    uniforms : {
      texel: {
        type: "v2",
        value: undefined},
      delta: {
        type: "v2",
        value: undefined},
      tSource: {
        type: "t",
        value: undefined},
      colors: {
        type: "v4v",
        value: undefined},

      mouse: {
        type: "v2",
        value: new THREE.Vector2(0.5,0.5)},
      mouseDown: {type: "i", value: 0},
      boundaryCondition: {type: "i", value:0},
      heatSourceSign: {type: "f", value:1},
      heatIntensity: {type: "f", value:100000},
      brushWidth: {type: "f", value:40},
      pause: {type: 'i', value:0}
    },

    setTextures: function(){
      this.mTextureBuffer1 = new THREE.WebGLRenderTarget(
      this.nx, this.ny,
      { minFilter: THREE.LinearFilter,
      magFilter: THREE.LinearFilter,
      format: THREE.RGBAFormat,
      type: THREE.FloatType,
      wrapS: THREE.ClampToEdgeWrapping,
      wrapT: THREE.ClampToEdgeWrapping});

      this.mTextureBuffer2 = new THREE.WebGLRenderTarget(
        this.nx, this.ny,
        { minFilter: THREE.LinearFilter,
        magFilter: THREE.LinearFilter,
        format: THREE.RGBAFormat,
        type: THREE.FloatType,
        wrapS: THREE.ClampToEdgeWrapping,
        wrapT: THREE.ClampToEdgeWrapping});

        // restart from texture 1:
        this.toggleBuffer = false;
        /*  revisar como iniciar desde texture1 /nueva ci */
    },

    setSize: function(nx,ny){
      this.nx = nx;
      this.ny = ny;
      this.setTextures();
      this.uniforms.texel = {
        type: "v2",
        value: new THREE.Vector2(1/this.nx,1/this.ny)};
  		this.uniforms.delta = {
        type: "v2",
        value: new THREE.Vector2(1/this.nx,1/this.ny)};
    }
  };

  this.materials = {
    initialMaterial : new THREE.ShaderMaterial({
  		uniforms: this.simulation.uniforms,
  		vertexShader: $.ajax(this.shaders.vshader,
        {async:false}).responseText,
  		fragmentShader: $.ajax(this.shaders.iFshader,
        {async:false}).responseText
  	}),

  	modelMaterial : new THREE.ShaderMaterial({
  		uniforms: this.simulation.uniforms,
  		vertexShader: $.ajax(this.shaders.vshader,
        {async:false}).responseText,
  		fragmentShader: $.ajax(this.shaders.mFshader,
        {async:false}).responseText
  	}),

  	screenMaterial : new THREE.ShaderMaterial({
  		uniforms: this.simulation.uniforms,
  		vertexShader: $.ajax(
        this.shaders.vshader,
        {async:false}).responseText,
  		fragmentShader: $.ajax(this.shaders.sFshader,
        {async:false}).responseText
  	})
  };

  this.objects = {
    planeScreen : new THREE.Mesh(
      new THREE.PlaneGeometry(this.width, this.height),
      this.materials.screenMaterial
    )
  };

  this.colormaps = {
    heat:  [new THREE.Vector4(1, 1, 1, -10),
				new THREE.Vector4(0, 1, 1, -6.6),
				new THREE.Vector4(0, 0, 1, -3.3),
				new THREE.Vector4(0, 0, 0, 0.0),
				new THREE.Vector4(1, 0, 0, 3.3),
				new THREE.Vector4(1, 1, 0, 6.6),
				new THREE.Vector4(1, 1, 1, 9.9)],
    blueInk:  [new THREE.Vector4(1, 1, 1, 0),
				new THREE.Vector4(0, 0, 1, 5.0),
				new THREE.Vector4(0, 0, 1, 10.0),
				new THREE.Vector4(0, 0, 1, 10.0),
				new THREE.Vector4(0, 0, 1, 10.0),
				new THREE.Vector4(0, 0, 1, 10.0),
				new THREE.Vector4(0, 0, 1, 10.0)]
  };

  this.setColormap = function(cmap){
    this.simulation.uniforms.colors.value = this.colormaps[cmap];
  };

  this.buildScene = function(){
    this.scene.add(this.camera);

    this.scene.add(this.objects.planeScreen);
  };


  this.renderInitialCondition = function(){

    this.objects.planeScreen.material = this.materials.initialMaterial;
    this.renderer.render(
      this.scene,
      this.camera,
      this.simulation.mTextureBuffer1,
      true
    );

    this.renderer.render(
      this.scene,
      this.camera,
      this.simulation.mTextureBuffer1,
      true
    );

    this.simulation.uniforms.tSource.value =
      this.simulation.mTextureBuffer1;
  };

  this.renderSimulation = function(){
    this.objects.planeScreen.material = this.materials.modelMaterial;

    if (!this.simulation.paused){
      for (var i=0; i< Math.floor(this.simulation.speed*10);i++){
        if(!this.simulation.toggleBuffer1){
  
          this.simulation.uniforms.tSource.value =
          this.simulation.mTextureBuffer1;
  
          this.renderer.render(
            this.scene,
            this.camera,
            this.simulation.mTextureBuffer2,
            true
          );
        }
        else{
  
          this.simulation.uniforms.tSource.value =
          this.simulation.mTextureBuffer2;
  
          this.renderer.render(
            this.scene,
            this.camera,
            this.simulation.mTextureBuffer1,
            true
          );
        }
  
        this.simulation.toggleBuffer1 = !this.simulation.toggleBuffer1;
      }      
    }


    this.renderScreen();

    requestAnimationFrame(this.renderSimulation.bind(this));
  }

  this.renderScreen = function(){

    this.objects.planeScreen.material = this.materials.screenMaterial;

    this.renderer.render(
      this.scene,
      this.camera
    );
  };

  this.onMouseMove = function(e){
    var ev = e ? e : this.container.event;

    this.mousex = ev.pageX - this.container.offsetLeft;
    this.mousey = ev.pageY - this.container.offsetTop;

    if (this.mouseDown){
      this.simulation.uniforms.mouse.value =
      new THREE.Vector2(this.mousex/this.width,1-this.mousey/this.height);
    }
  }

  this.onMouseDown = function(e){
    var ev = e ? e: window.event;
    ev.preventDefault();
  	this.mouseDown = true;
  	this.simulation.uniforms.mouseDown.value = 1;
  	if (e.which == 3){
  		this.simulation.uniforms.heatSourceSign.value = -1;
  	}
  	else {
  		this.simulation.uniforms.heatSourceSign.value =  1;
  	}

  	this.simulation.uniforms.mouse.value =
      new THREE.Vector2(this.mousex/this.width,
  								1-this.mousey/this.height);
  }

  this.onMouseUp = function(e){
  	this.mouseDown = false;
  	this.simulation.uniforms.mouseDown.value = 0;
  }

  this.onMouseOut = function(e){
  	this.mouseDown = false;
  	this.simulation.uniforms.mouseDown.value = 0;
  }


  this.start = function(){
    this.setColormap("heat");

    this.buildScene();

    this.simulation.setSize(255,255*this.height/this.width);

    this.renderInitialCondition();

    this.renderScreen();

    this.container.onmousedown = this.onMouseDown.bind(this);
    this.container.onmousemove = this.onMouseMove.bind(this);
    this.container.onmouseup = this.onMouseUp.bind(this);
    this.container.onmouseout = this.onMouseOut.bind(this);

    this.renderSimulation()
  };
};
