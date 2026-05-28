/**
 * 音乐在线播放器 - 主逻辑
 * 功能：播放/暂停、上一首/下一首、播放列表、进度条跳转、音量控制、背景切换、MV模式
 */

(function () {
  'use strict';

  // ===== 音乐数据配置 =====
  var songList = [
    { name: 'Faded', artist: 'Alan-Walker', src: 'mp3/music0.mp3', video: 'mp4/video0.mp4', bg: 'img/bg0.png', record: 'img/record0.jpg' },
    { name: 'Kiss Fight', artist: 'gnash', src: 'mp3/music1.mp3', video: 'mp4/video1.mp4', bg: 'img/bg1.png', record: 'img/record1.jpg' },
    { name: 'Coming Home', artist: 'Dash Berlin', src: 'mp3/music2.mp3', video: 'mp4/video2.mp4', bg: 'img/bg2.png', record: 'img/record2.jpg' },
    { name: 'Coming Home', artist: 'Dash Berlin', src: 'mp3/music3.mp3', video: 'mp4/video3.mp4', bg: 'img/bg3.png', record: 'img/record3.jpg' }
  ];

  // ===== DOM 引用 =====
  var audio = document.getElementById('audioPlayer');
  var bgLayer = document.getElementById('bgLayer');
  var recordImg = document.getElementById('recordImg');
  var recordWrapper = document.getElementById('recordWrapper');
  var songNameDisplay = document.getElementById('songNameDisplay');
  var currentTimeEl = document.getElementById('currentTime');
  var totalTimeEl = document.getElementById('totalTime');
  var progressFill = document.getElementById('progressFill');
  var progressBar = document.getElementById('progressBar');
  var volumeFill = document.getElementById('volumeFill');
  var volumeSlider = document.getElementById('volumeSlider');
  var btnPlayImg = document.getElementById('btnPlayImg');
  var btnMuteImg = document.getElementById('btnMuteImg');
  var playlistPanel = document.getElementById('playlistPanel');
  var playlistItems = document.getElementById('playlistItems');
  var recordSection = document.getElementById('recordSection');
  var mvSection = document.getElementById('mvSection');
  var mvVideo = document.getElementById('mvVideo');

  // ===== 状态变量 =====
  var currentIndex = 0;
  var isPlaying = false;
  var isMuted = false;
  var prevVolume = 0.7;
  var playMode = 0; // 0: 列表循环, 1: 单曲循环, 2: 随机播放
  var isMVMode = false;
  var progressDragging = false;
  var volumeDragging = false;

  // ===== 初始化 =====
  function init() {
    audio.volume = prevVolume;
    updateVolumeUI();
    loadSong(0);
    bindEvents();
    loadPlaylistDurations();
  }

  // ===== 加载歌曲 =====
  function loadSong(index) {
    currentIndex = index;
    var song = songList[index];

    audio.src = song.src;
    audio.load();
    recordImg.src = song.record;
    bgLayer.style.backgroundImage = 'url(' + song.bg + ')';
    songNameDisplay.textContent = song.name + ' - ' + song.artist;
    currentTimeEl.textContent = '00:00';
    totalTimeEl.textContent = '--:--';
    progressFill.style.width = '0%';

    // 如果当前是MV模式,更新视频源
    if (isMVMode) {
      mvVideo.querySelector('source').src = song.video;
      mvVideo.load();
    }

    // 更新播放列表高亮
    updatePlaylistHighlight();
  }

  // ===== 播放/暂停切换 =====
  function togglePlay() {
    if (isMVMode) {
      toggleMVPlay();
      return;
    }

    if (isPlaying) {
      audio.pause();
    } else {
      audio.play().catch(function () {});
    }
  }

  function setPlaying(state) {
    isPlaying = state;
    if (state) {
      btnPlayImg.src = 'img/暂停.png';
      recordWrapper.classList.add('playing');
      recordWrapper.classList.remove('paused');
    } else {
      btnPlayImg.src = 'img/继续播放.png';
      recordWrapper.classList.add('paused');
      recordWrapper.classList.remove('playing');
    }
  }

  // ===== 上一首 / 下一首 =====
  function prevSong() {
    if (playMode === 2) {
      // 随机播放
      var rand;
      do { rand = Math.floor(Math.random() * songList.length); }
      while (rand === currentIndex && songList.length > 1);
      loadSong(rand);
    } else {
      var idx = (currentIndex - 1 + songList.length) % songList.length;
      loadSong(idx);
    }
    if (isPlaying || isMVMode) {
      if (isMVMode) {
        mvVideo.play().catch(function () {});
      } else {
        audio.play().catch(function () {});
      }
    }
  }

  function nextSong() {
    if (playMode === 2) {
      var rand;
      do { rand = Math.floor(Math.random() * songList.length); }
      while (rand === currentIndex && songList.length > 1);
      loadSong(rand);
    } else {
      var idx = (currentIndex + 1) % songList.length;
      loadSong(idx);
    }
    if (isPlaying || isMVMode) {
      if (isMVMode) {
        mvVideo.play().catch(function () {});
      } else {
        audio.play().catch(function () {});
      }
    }
  }

  // ===== 播放模式切换 =====
  function setPlayMode(mode) {
    playMode = parseInt(mode);
    document.querySelectorAll('.mode-btn').forEach(function (btn) {
      btn.classList.toggle('active', parseInt(btn.dataset.mode) === playMode);
    });
  }

  // ===== 进度条 =====
  function updateProgress() {
    if (progressDragging) return;

    var current = isMVMode ? mvVideo.currentTime : audio.currentTime;
    var total = isMVMode ? mvVideo.duration : audio.duration;

    if (isNaN(total) || total === 0) {
      progressFill.style.width = '0%';
      currentTimeEl.textContent = '00:00';
      return;
    }

    var percent = (current / total) * 100;
    progressFill.style.width = (percent > 100 ? 100 : percent) + '%';
    currentTimeEl.textContent = transTime(current);

    if (totalTimeEl.textContent === '--:--') {
      totalTimeEl.textContent = transTime(total);
    }
  }

  function seekTo(e) {
    var rect = progressBar.getBoundingClientRect();
    var ratio = (e.clientX - rect.left) / rect.width;
    ratio = Math.max(0, Math.min(1, ratio));

    var total = isMVMode ? mvVideo.duration : audio.duration;
    if (isNaN(total) || total === 0) return;

    var seekTime = ratio * total;
    if (isMVMode) {
      mvVideo.currentTime = seekTime;
    } else {
      audio.currentTime = seekTime;
    }
    progressFill.style.width = (ratio * 100) + '%';
    currentTimeEl.textContent = transTime(seekTime);
  }

  // ===== 音量控制 =====
  function updateVolumeUI() {
    var vol = isMuted ? 0 : audio.volume;
    volumeFill.style.width = (vol * 100) + '%';
    if (isMuted || audio.volume === 0) {
      btnMuteImg.src = 'img/静音.png';
    } else {
      btnMuteImg.src = 'img/音量.png';
    }
  }

  function toggleMute() {
    if (isMuted) {
      isMuted = false;
      audio.volume = prevVolume || 0.7;
    } else {
      isMuted = true;
      prevVolume = audio.volume;
      audio.volume = 0;
    }
    updateVolumeUI();
  }

  function setVolume(e) {
    var rect = volumeSlider.getBoundingClientRect();
    var ratio = (e.clientX - rect.left) / rect.width;
    ratio = Math.max(0, Math.min(1, ratio));

    audio.volume = ratio;
    if (ratio > 0) {
      isMuted = false;
      prevVolume = ratio;
    }
    updateVolumeUI();
  }

  // ===== MV模式切换 =====
  function toggleMVMode() {
    isMVMode = !isMVMode;

    if (isMVMode) {
      // 切换到MV模式
      if (isPlaying) {
        audio.pause();
        setPlaying(false);
      }
      recordSection.style.display = 'none';
      mvSection.style.display = 'flex';
      mvVideo.querySelector('source').src = songList[currentIndex].video;
      mvVideo.load();
      mvVideo.play().catch(function () {});
    } else {
      // 切换回音乐模式
      mvVideo.pause();
      mvSection.style.display = 'none';
      recordSection.style.display = 'flex';
      audio.load();
    }
  }

  function toggleMVPlay() {
    if (mvVideo.paused) {
      mvVideo.play().catch(function () {});
      setPlaying(true);
    } else {
      mvVideo.pause();
      setPlaying(false);
    }
  }

  // ===== 播放列表 =====
  function togglePlaylist() {
    playlistPanel.classList.toggle('visible');
  }

  function updatePlaylistHighlight() {
    var items = playlistItems.querySelectorAll('.playlist-item');
    items.forEach(function (item, i) {
      item.classList.toggle('active', i === currentIndex);
    });
  }

  // ===== 时间格式化 =====
  function transTime(value) {
    var time = '';
    var h = parseInt(value / 3600);
    value %= 3600;
    var m = parseInt(value / 60);
    var s = parseInt(value % 60);
    if (h > 0) {
      time = formatTime(h + ':' + m + ':' + s);
    } else {
      time = formatTime(m + ':' + s);
    }
    return time;
  }

  function formatTime(value) {
    var time = '';
    var s = value.split(':');
    var i = 0;
    for (; i < s.length - 1; i++) {
      time += s[i].length === 1 ? '0' + s[i] : s[i];
      time += ':';
    }
    time += s[i].length === 1 ? '0' + s[i] : s[i];
    return time;
  }

  // ===== 加载播放列表时长 =====
  function loadPlaylistDurations() {
    songList.forEach(function (song, i) {
      var temp = new Audio();
      temp.preload = 'metadata';
      temp.src = song.src;
      temp.addEventListener('loadedmetadata', function () {
        var durEl = playlistItems.querySelectorAll('.pl-duration')[i];
        if (durEl && !isNaN(temp.duration)) {
          durEl.textContent = transTime(temp.duration);
        }
      });
    });
  }

  // ===== 事件绑定 =====
  function bindEvents() {
    // 播放/暂停
    document.getElementById('btnPlay').addEventListener('click', togglePlay);

    // 上一首/下一首
    document.getElementById('btnPrev').addEventListener('click', prevSong);
    document.getElementById('btnNext').addEventListener('click', nextSong);

    // 进度条
    progressBar.addEventListener('mousedown', function (e) {
      progressDragging = true;
      seekTo(e);
    });

    document.addEventListener('mousemove', function (e) {
      if (progressDragging) {
        seekTo(e);
      }
      if (volumeDragging) {
        setVolume(e);
      }
    });

    document.addEventListener('mouseup', function () {
      progressDragging = false;
      volumeDragging = false;
    });

    // 音量
    volumeSlider.addEventListener('mousedown', function (e) {
      volumeDragging = true;
      setVolume(e);
    });

    document.getElementById('btnMute').addEventListener('click', toggleMute);

    // 播放模式
    document.querySelectorAll('.mode-btn').forEach(function (btn) {
      btn.addEventListener('click', function () {
        setPlayMode(this.dataset.mode);
      });
    });

    // 播放列表
    document.getElementById('btnPlaylist').addEventListener('click', togglePlaylist);
    document.getElementById('playlistClose').addEventListener('click', function () {
      playlistPanel.classList.remove('visible');
    });

    // 播放列表项点击
    playlistItems.addEventListener('click', function (e) {
      var item = e.target.closest('.playlist-item');
      if (!item) return;
      var index = parseInt(item.dataset.index);
      if (index !== currentIndex) {
        loadSong(index);
      }
      if (isMVMode) {
        mvVideo.play().catch(function () {});
      } else {
        audio.play().catch(function () {});
      }
    });

    // 音频事件
    audio.addEventListener('play', function () { setPlaying(true); });
    audio.addEventListener('pause', function () { setPlaying(false); });
    audio.addEventListener('ended', function () {
      if (playMode === 1) {
        // 单曲循环
        audio.currentTime = 0;
        audio.play().catch(function () {});
      } else {
        nextSong();
        audio.play().catch(function () {});
      }
    });
    audio.addEventListener('timeupdate', updateProgress);
    audio.addEventListener('loadedmetadata', function () {
      totalTimeEl.textContent = transTime(audio.duration);
    });

    // MV视频事件
    mvVideo.addEventListener('play', function () { setPlaying(true); });
    mvVideo.addEventListener('pause', function () { setPlaying(false); });
    mvVideo.addEventListener('ended', function () {
      if (playMode === 1) {
        mvVideo.currentTime = 0;
        mvVideo.play().catch(function () {});
      } else {
        nextSong();
        mvVideo.play().catch(function () {});
      }
    });
    mvVideo.addEventListener('timeupdate', updateProgress);
    mvVideo.addEventListener('loadedmetadata', function () {
      totalTimeEl.textContent = transTime(mvVideo.duration);
    });

    // MV切换
    document.getElementById('mvToggle').addEventListener('click', toggleMVMode);

    // 键盘快捷键
    document.addEventListener('keydown', function (e) {
      switch (e.key) {
        case ' ':
          e.preventDefault();
          togglePlay();
          break;
        case 'ArrowLeft':
          e.preventDefault();
          prevSong();
          break;
        case 'ArrowRight':
          e.preventDefault();
          nextSong();
          break;
        case 'ArrowUp':
          e.preventDefault();
          audio.volume = Math.min(1, audio.volume + 0.1);
          if (audio.volume > 0) { isMuted = false; }
          updateVolumeUI();
          break;
        case 'ArrowDown':
          e.preventDefault();
          audio.volume = Math.max(0, audio.volume - 0.1);
          updateVolumeUI();
          break;
        case 'm':
          toggleMute();
          break;
        case 'l':
          togglePlaylist();
          break;
      }
    });
  }

  // ===== 启动 =====
  init();
})();
