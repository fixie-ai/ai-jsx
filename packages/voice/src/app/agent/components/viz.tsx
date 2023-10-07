import * as THREE from 'three';

export function AudioAnalyser(window: Window) {

  var audioanalyser = {
      audioCtx: null,
      source: null,
      analyser: null,
      gainNode: null,
      hasNewSong: false,
      init: function() {
          audioanalyser.audioCtx = new( window.AudioContext || window.webkitAudioContext )();
          audioanalyser.analyser = audioanalyser.audioCtx.createAnalyser();
          audioanalyser.gainNode = audioanalyser.audioCtx.createGain();
          audioanalyser.gainNode.gain.value = 0.2;
      },
      makeAudio: function( data ) {
          if( audioanalyser.source ) {
              audioanalyser.source.stop(0);
          }

          audioanalyser.source = audioanalyser.audioCtx.createBufferSource();

          if( audioanalyser.audioCtx.decodeAudioData ) {
              audioanalyser.audioCtx.decodeAudioData( data, function( buffer ) {
                  audioanalyser.source.buffer = buffer;
                  playAudio();
              } );
          }
          else {
              audioanalyser.source.buffer = audioanalyser.audioCtx.createBuffer( data, false );
              playAudio();
          }
          audioAnalyser.hasNewSong = true;
      }
  }

  function playAudio() {
      audioanalyser.source.connect( audioanalyser.analyser );
      audioanalyser.source.connect( audioanalyser.gainNode );
      audioanalyser.gainNode.connect( audioanalyser.audioCtx.destination );
      audioanalyser.source.start(0);
      audioAnalyser.hasNewSong = false;
  }

  return audioanalyser;

}

export function Iris() {

  var group;
  var analyser;
  var view;
  var scene;

  var bufferLength;
  var dataArray;
  var visualArray;
  var fsize = 4096; 
  var numBars = 128;

  var plane;

  var spectrum;

  var vertexShader = [
          "varying vec4 pos;",
          "void main() {",
              "pos = modelViewMatrix * vec4( position, 1.0 );",
              "gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );",
          "}"
      ].join('\n');
  var fragmentShader = [
          "uniform vec3 col;",
          "varying vec4 pos;",
          "void main() {",
              "gl_FragColor = vec4( -pos.z/180.0 * col.r, -pos.z/180.0 * col.g, -pos.z/180.0 * col.b, 1.0 );",
          "}"
      ].join('\n');


  var iris = {
      name: 'Iris',
      init: function( Analyser, View ) {
          analyser = Analyser.analyser;
          view = View;
          scene = View.scene;
      },
      make: function() {
          group = new THREE.Object3D();
          spectrum = new Spectrum();
          analyser.fftSize = fsize;
          bufferLength = analyser.frequencyBinCount;
          dataArray = new Uint8Array(bufferLength);

          view.usePerspectiveCamera();
          view.camera.position.y = 0;
          view.camera.position.z = 250;

          for( var i = 0; i < numBars / 2; i++ ) {

              var uniforms = {
                  col: { type: 'c', value: new THREE.Color( 'hsl(240, 100%, 50%)' ) },
              };
              var material = new THREE.ShaderMaterial( {
                  uniforms: uniforms,
                  vertexShader: vertexShader,
                  fragmentShader: fragmentShader
              } );

              geometry = new THREE.PlaneGeometry( 3, 500, 1 );
              geometry.rotateX( Math.PI / 1.8 );
              geometry.applyMatrix( new THREE.Matrix4().makeTranslation( 0, 60, 0 ) );
              plane = new THREE.Mesh( geometry, material );
              
              plane.rotation.z = i * ( Math.PI * 2 / numBars ) + ( Math.PI / numBars );

              group.add( plane );

              //

              geometry = new THREE.PlaneGeometry( 3, 500, 1 );
              geometry.rotateX( Math.PI / 1.8 );
              geometry.applyMatrix( new THREE.Matrix4().makeTranslation( 0, 60, 0 ) );
              plane = new THREE.Mesh( geometry, material );
              
              plane.rotation.z = -i * ( Math.PI * 2 / numBars ) - ( Math.PI / numBars );

              group.add( plane );
          }
          scene.add( group );
      },
      destroy: function() {
          scene.remove( group );
      },
      render: function() {
          analyser.getByteFrequencyData( dataArray );
          var loudness = getLoudness( dataArray );
          visualArray = spectrum.GetVisualBins( dataArray, numBars, 4, 1300 );
          if( group ) {
              for(var i = 0; i < visualArray.length / 2; i++) {
                  
                  //Left and right share the same material hence why we don't need i*2+1
                  setUniformColor( i * 2, loudness );

                  group.children[i * 2].geometry.attributes.position.array[7] = visualArray[i] / 2 + ( 65 + (loudness/1.5) );
                  group.children[i * 2].geometry.attributes.position.array[10] = visualArray[i] / 2 + ( 65 + (loudness/1.5) );
                  group.children[i * 2].geometry.attributes.position.needsUpdate = true;

                  group.children[i * 2 + 1].geometry.attributes.position.array[7] = visualArray[i] / 2 + ( 65 + (loudness/1.5) );
                  group.children[i * 2 + 1].geometry.attributes.position.array[10] = visualArray[i] / 2 + ( 65 + (loudness/1.5) );
                  group.children[i * 2 + 1].geometry.attributes.position.needsUpdate = true;
              }
          }
      }
  }

  function setUniformColor( groupI, loudness ) {
      var h = modn( 250 - (loudness*2.2), 360 );
      group.children[groupI].material.uniforms.col.value = new THREE.Color( 'hsl(' + h + ', 100%, 50%)' );
  }

  
  function getLoudness( arr ) {
      var sum = 0;
      for( var i = 0; i < arr.length; i ++ ) {
          sum += arr[i];
      }
      return sum / arr.length;
  }

  function modn( n, m ) {
      return ( (n % m) + m ) % m;
  }

  return iris;

}

export function View(window: Window) {

  var targetRotation = 0;
  var targetRotationOnMouseDown = 0;
  var mouseX = 0;
  var mouseXOnMouseDown = 0;
  var windowHalfX = window.innerWidth / 2;
  var windowHalfY = window.innerHeight / 2;
  var geometry;
  var AudioAnalyser;
  
  var view = {
      scene: null,
      renderer: null,
      camera: null,
      container: null,
      init: function( audioAnalyser ) {
          AudioAnalyser = audioAnalyser;
          
          view.container = document.createElement( 'div' );
          view.container.width = '100%';
          view.container.height = '100%';
          document.body.appendChild( view.container );
          view.camera = new THREE.OrthographicCamera( window.innerWidth / - 2, window.innerWidth / 2, window.innerHeight / 2, window.innerHeight / - 2, 1, 1000 );
          view.camera.position.y = 150;
          view.camera.position.z = 500;
          view.scene = new THREE.Scene();
          // Plane
         
          view.renderer = new THREE.WebGLRenderer( { alpha: true, preserveDrawingBuffer: true } );
          view.renderer.setPixelRatio( window.devicePixelRatio );
          view.renderer.setSize( window.innerWidth, window.innerHeight );
          view.container.appendChild( view.renderer.domElement );
          //
          window.addEventListener( 'resize', onWindowResize, false );

          animate();
      },
      usePerspectiveCamera: function() {
          view.camera = new THREE.PerspectiveCamera( 70, window.innerWidth / window.innerHeight, 0.01, 2000 );
          view.camera.position.y = 150;
          view.camera.position.z = 500;
      },
      useOrthographicCamera: function() {
          view.camera = new THREE.OrthographicCamera( window.innerWidth / - 2, window.innerWidth / 2, window.innerHeight / 2, window.innerHeight / - 2, 1, 1000 );
          view.camera.position.y = 150;
          view.camera.position.z = 500;
      },
      renderVisualization: null
  }

  function onWindowResize() {
      windowHalfX = window.innerWidth / 2;
      windowHalfY = window.innerHeight / 2;
      view.camera.aspect = window.innerWidth / window.innerHeight;
      view.camera.updateProjectionMatrix();
      view.renderer.setSize( window.innerWidth, window.innerHeight );
  }
  //
  function animate() {
      setTimeout( function() {

          requestAnimationFrame( animate );

      }, 1000 / 60 );
      render();
  }
  function render() {

      if( view.renderVisualization ) {
          view.renderVisualization();
      }

      view.renderer.render( view.scene, view.camera );
  }

  return view;
}