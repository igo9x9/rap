phina.globalize();

const SCREEN_WIDTH = 640;
const SCREEN_HEIGHT = 960;
const NOTE_TRAVEL_MS = 1800;
const HIT_WINDOW_MS = 230;
const NOTE_START_X = 500;
const JUDGE_X = 282;
const MOUTH_TALK_MS = 750;
const MOUTH_OPEN_MIN_MS = 70;
const MOUTH_OPEN_MAX_MS = 140;
const MOUTH_CLOSED_MIN_MS = 90;
const MOUTH_CLOSED_MAX_MS = 220;

const ASSETS = {
  image: {
    face1: "face1.png",
    face2: "face2.png",
    board01: "board01.png",
    board02: "board02.png",
    board03: "board03.png",
    board04: "board04.png",
    board05: "board05.png",
    lyric01: "lyric01.png",
    lyric02: "lyric02.png",
    lyric03: "lyric03.png",
    lyric04: "lyric04.png",
    lyric05: "lyric05.png",
    lyric06: "lyric06.png",
    lyric07: "lyric07.png",
    lyric08: "lyric08.png",
    lyric09: "lyric09.png",
    lyric10: "lyric10.png",
    lyric11: "lyric11.png",
    lyric12: "lyric12.png",
    lyric13: "lyric13.png",
  },
  sound: {
    music: "music1.mp3",
  },
};

// set: 現在の画像を全部消してから追加
// add: 現在の画像を残して上に追加
const VISUAL_EVENTS = [
  { time: 0.0, action: "set", image: "board01" },
  { time: 4.9, action: "add", image: "lyric01" },
  { time: 6.0, action: "add", image: "lyric02" },
  { time: 7.0, action: "set", image: "board01" },
  { time: 7.0, action: "add", image: "lyric03" },
  { time: 9.6, action: "set", image: "board02" },
  { time: 9.6, action: "add", image: "lyric04" },
  { time: 10.3, action: "add", image: "lyric05" },
  { time: 11.0, action: "set", image: "board02" },
  { time: 11.0, action: "add", image: "lyric06" },
  { time: 12.1, action: "set", image: "board03" },
  { time: 12.1, action: "add", image: "lyric07" },
  { time: 12.7, action: "add", image: "lyric08" },
  { time: 13.2, action: "set", image: "board03" },
  { time: 13.2, action: "add", image: "lyric09" },
  { time: 14.2, action: "set", image: "board04" },
  { time: 15.2, action: "add", image: "lyric10" },
  { time: 20.0, action: "set", image: "board04" },
  { time: 20.0, action: "add", image: "lyric11" },
  { time: 23.8, action: "set", image: "board04" },
  { time: 23.8, action: "add", image: "lyric12" },
  { time: 25.0, action: "set", image: "board05" },
  { time: 25.0, action: "add", image: "lyric13" },
];

// 簡単な1ボタン譜面。music.mp3開始からの秒数。
const NOTE_TIMES = [
  5, 5.8, 7.2, 8.2, 9.6, 10.2, 10.9, 12.2, 12.8, 13.4,
  15.1, 17.0, 20, 21.8, 24.1, 24.4, 24.7, 25.1, 25.5
];

phina.define("MainScene", {
  superClass: "DisplayScene",

  init: function() {
    this.superInit({
      width: SCREEN_WIDTH,
      height: SCREEN_HEIGHT,
      backgroundColor: "#fff",
    });

    this.playing = false;
    this.gameOver = false;
    this.cleared = false;
    this.paused = false;
    this.pauseStartTime = 0;
    this.pausedAtMs = 0;
    this.startTime = 0;
    this.nextVisualIndex = 0;
    this.nextNoteIndex = 0;
    this.noteSprites = [];
    this.mouthTalking = false;
    this.mouthOpen = false;
    this.mouthTalkEndMs = 0;
    this.nextMouthChangeMs = 0;

    // 上部の学習表示領域。
    // 背景を先に作り、その後にvisualLayerを作る。
    // phina.jsは後から追加したDisplayElementほど手前に描画されるため、
    // 学習画像が背景ボックスの裏へ回らない。
    this.visualBackground = RectangleShape({
      width: 620,
      height: 580,
      fill: "#f2ead8",
      // stroke: "#555555",
      strokeWidth: 0,
    }).addChildTo(this).setPosition(320, 300);

    // visualLayerは画面原点(0,0)のまま使用。
    // 620x580の画像をすべて(320,300)へ重ねる。
    this.visualLayer = DisplayElement().addChildTo(this);

    Sprite("board01")
      .addChildTo(this.visualLayer)
      .setPosition(320, 300);

    // 下部左: 口閉じ/口開きの2枚を同じ位置・同じサイズで重ねる。
    // setImage()は画像切替時に元画像サイズへ戻る場合があるため使わない。
    this.faceClosed = Sprite("face1")
      .addChildTo(this)
      .setPosition(105, 700)
      .setSize(170, 170);

    this.faceOpen = Sprite("face2")
      .addChildTo(this)
      .setPosition(105, 700)
      .setSize(170, 170);
    this.faceOpen.visible = false;

    // 下部中央: 判定ラインとノーツ通路。
    RectangleShape({
      width: 300,
      height: 120,
      fill: "#262a30",
      stroke: "#60656d",
      strokeWidth: 3,
      cornerRadius: 18,
    }).addChildTo(this).setPosition(335, 700);

    this.judgeCircle = CircleShape({
      radius: 34,
      fill: "#353a42",
      stroke: "#f4d35e",
      strokeWidth: 6,
    }).addChildTo(this).setPosition(JUDGE_X, 700);

    Label({
      text: "HIT",
      fontSize: 18,
      fontWeight: "bold",
      fill: "#f4d35e",
    }).addChildTo(this).setPosition(JUDGE_X, 700);

    // 下部右: 唯一の入力ボタン。
    this.hitButton = Button({
      text: "START",
      width: 140,
      height: 140,
      fontSize: 31,
      fill: "#c74636",
      stroke: "#7e291f",
      strokeWidth: 5,
      fontColor: "white",
      cornerRadius: 70,
    }).addChildTo(this).setPosition(545, 700);
    // 押し始めた瞬間の役割を記録する。
    // PUSH中にGAME OVERへ遷移しても、その同じクリックをRETRYとして扱わない。
    this.mainButtonPressMode = "start";
    this.hitButton.onpointstart = function() {
      if (this.playing && !this.gameOver) {
        this.mainButtonPressMode = "push";
      } else if (this.gameOver) {
        this.mainButtonPressMode = "retry";
      } else {
        this.mainButtonPressMode = "start";
      }
    }.bind(this);
    this.hitButton.onpush = function() {
      this.handleMainButton(this.mainButtonPressMode);
    }.bind(this);

    this.messageLabel = Label({
      text: "STARTを押してください",
      fontSize: 25,
      fontWeight: "bold",
      fill: "#000",
    }).addChildTo(this).setPosition(320, 785);

    // 開発用PAUSE。停止時刻を画面とConsoleに表示する。
    // this.pauseButton = Button({
    //   text: "PAUSE",
    //   width: 125,
    //   height: 48,
    //   fontSize: 19,
    //   fill: "#555b63",
    //   fontColor: "white",
    //   cornerRadius: 10,
    // }).addChildTo(this).setPosition(565, 30);
    // this.pauseButton.onpush = function() {
    //   this.togglePause();
    // }.bind(this);

    this.pauseTimeLabel = Label({
      text: "",
      fontSize: 19,
      fontWeight: "bold",
      fill: "#f4d35e",
      align: "right",
    }).addChildTo(this).setPosition(450, 30);

  },

  handleMainButton: function(capturedMode) {
    const mode = capturedMode || (this.playing && !this.gameOver ? "push" : (this.gameOver ? "retry" : "start"));

    if (mode === "push") {
      this.tryHit();
      return;
    }

    // retry/startは、押し始めた時点からその状態だった場合だけ開始する。
    if (!this.playing) {
      this.startGame();
    }
  },

  startGame: function() {
    if (this.playing) return;

    SoundManager.stopMusic();
    this.clearVisuals();
    this.clearNotes();

    this.playing = true;
    this.gameOver = false;
    this.cleared = false;
    this.paused = false;
    this.pauseStartTime = 0;
    this.pausedAtMs = 0;
    // this.pauseButton.text = "PAUSE";
    this.pauseTimeLabel.text = "";
    this.startTime = performance.now();
    this.nextVisualIndex = 0;
    this.nextNoteIndex = 0;
    this.messageLabel.text = "ラップを聴いてリズムを刻もう";
    this.hitButton.text = "PUSH";
    this.hitButton.alpha = 1;
    this.mainButtonPressMode = "push";
    this.stopMouthTalk();

    const music = SoundManager.playMusic("music", 0, false);

    // phina.asset.Soundは再生完了時にendedイベントを発火する。
    // 曲が自然終了した場合だけクリア扱いにする。
    if (music && music.one) {
      music.one("ended", function() {
        if (this.playing && !this.gameOver && !this.paused) {
          this.clearGame();
        }
      }.bind(this));
    } else if (music && music.on) {
      // one()が無い環境向け。
      music.on("ended", function() {
        if (this.playing && !this.gameOver && !this.paused) {
          this.clearGame();
        }
      }.bind(this));
    }
  },

  update: function(app) {
    // PAUSE中は入力、画像進行、ノーツ移動、MISS判定をすべて停止。
    if (this.paused) return;

    // Spaceキーも唯一のボタンと同じ。
    if (app.keyboard.getKeyDown("space")) {
      this.handleMainButton();
    }

    if (!this.playing) return;

    const elapsedMs = performance.now() - this.startTime;
    const elapsedSec = elapsedMs / 1000;

    this.updateMouth(elapsedMs);
    this.processVisualEvents(elapsedSec);
    this.createUpcomingNotes(elapsedMs);
    this.updateNotes(elapsedMs);
    this.checkMiss(elapsedMs);
  },

  togglePause: function() {
    if (!this.playing || this.gameOver) return;

    if (!this.paused) {
      this.paused = true;
      this.pauseStartTime = performance.now();
      this.pausedAtMs = this.pauseStartTime - this.startTime;
      this.stopMouthTalk();

      SoundManager.pauseMusic();

      const sec = this.pausedAtMs / 1000;
      // this.pauseButton.text = "RESUME";
      this.pauseTimeLabel.text = sec.toFixed(3) + " sec";
      console.log("PAUSE time: " + sec.toFixed(3) + " sec");
    } else {
      const resumeTime = performance.now();
      const pauseDuration = resumeTime - this.pauseStartTime;

      // 一時停止していた実時間をstartTimeへ加算し、
      // VISUAL_EVENTS / NOTE_TIMESのゲーム時刻を停止地点から再開する。
      this.startTime += pauseDuration;
      this.paused = false;

      SoundManager.resumeMusic();

      // this.pauseButton.text = "PAUSE";
      this.pauseTimeLabel.text = "";
      console.log("RESUME from: " + (this.pausedAtMs / 1000).toFixed(3) + " sec");
    }
  },

  processVisualEvents: function(elapsedSec) {
    while (
      this.nextVisualIndex < VISUAL_EVENTS.length &&
      elapsedSec >= VISUAL_EVENTS[this.nextVisualIndex].time
    ) {
      const event = VISUAL_EVENTS[this.nextVisualIndex];

      if (event.action === "set") {
        this.clearVisuals();
      }

      if (event.action === "set" || event.action === "add") {
        Sprite(event.image)
          .addChildTo(this.visualLayer)
          .setPosition(320, 300);
      }

      this.nextVisualIndex++;
    }
  },

  clearVisuals: function() {
    this.visualLayer.children.slice().forEach(function(child) {
      child.remove();
    });
  },

  createUpcomingNotes: function(elapsedMs) {
    while (this.nextNoteIndex < NOTE_TIMES.length) {
      const targetMs = NOTE_TIMES[this.nextNoteIndex] * 1000;
      if (targetMs - elapsedMs > NOTE_TRAVEL_MS) break;

      const note = CircleShape({
        radius: 25,
        fill: "#f4d35e",
        stroke: "#fff3b0",
        strokeWidth: 4,
      }).addChildTo(this).setPosition(NOTE_START_X, 700);

      note.targetMs = targetMs;
      note.noteIndex = this.nextNoteIndex;
      this.noteSprites.push(note);
      this.nextNoteIndex++;
    }
  },

  updateNotes: function(elapsedMs) {
    this.noteSprites.forEach(function(note) {
      const remain = note.targetMs - elapsedMs;
      const progress = 1 - remain / NOTE_TRAVEL_MS;
      note.x = NOTE_START_X + (JUDGE_X - NOTE_START_X) * progress;
    });
  },

  tryHit: function() {
    if (!this.playing || this.gameOver) return;

    const elapsedMs = performance.now() - this.startTime;
    if (this.noteSprites.length === 0) {
      this.endGame("早すぎ！", null);
      return;
    }

    let nearest = null;
    let nearestDiff = Infinity;

    this.noteSprites.forEach(function(note) {
      const diff = Math.abs(note.targetMs - elapsedMs);
      if (diff < nearestDiff) {
        nearest = note;
        nearestDiff = diff;
      }
    });

    if (nearest && nearestDiff <= HIT_WINDOW_MS) {
      nearest.remove();
      this.noteSprites = this.noteSprites.filter(function(note) {
        return note !== nearest;
      });
      this.startMouthTalk(elapsedMs);
      this.messageLabel.text = "GOOD!";
      this.judgeCircle.tweener.clear()
        .to({ scaleX: 1.24, scaleY: 1.24 }, 70)
        .to({ scaleX: 1, scaleY: 1 }, 90);
    } else {
      this.endGame("タイミングミス！", nearest);
    }
  },

  startMouthTalk: function(elapsedMs) {
    this.mouthTalking = true;
    this.mouthTalkEndMs = elapsedMs + MOUTH_TALK_MS;
    if (this.nextMouthChangeMs <= elapsedMs) {
      this.nextMouthChangeMs = elapsedMs;
    }
  },

  updateMouth: function(elapsedMs) {
    if (!this.mouthTalking) return;
    if (elapsedMs >= this.mouthTalkEndMs) {
      this.stopMouthTalk();
      return;
    }
    if (elapsedMs < this.nextMouthChangeMs) return;

    this.mouthOpen = !this.mouthOpen;
    this.faceClosed.visible = !this.mouthOpen;
    this.faceOpen.visible = this.mouthOpen;

    let waitMs;
    if (this.mouthOpen) {
      waitMs = MOUTH_OPEN_MIN_MS + Math.random() * (MOUTH_OPEN_MAX_MS - MOUTH_OPEN_MIN_MS);
    } else {
      waitMs = MOUTH_CLOSED_MIN_MS + Math.random() * (MOUTH_CLOSED_MAX_MS - MOUTH_CLOSED_MIN_MS);
    }
    this.nextMouthChangeMs = elapsedMs + waitMs;
  },

  stopMouthTalk: function() {
    this.mouthTalking = false;
    this.mouthOpen = false;
    this.mouthTalkEndMs = 0;
    this.nextMouthChangeMs = 0;
    if (this.faceClosed) this.faceClosed.visible = true;
    if (this.faceOpen) this.faceOpen.visible = false;
  },

  checkMiss: function(elapsedMs) {
    if (this.noteSprites.length === 0) return;

    const missedNote = this.noteSprites.find(function(note) {
      return elapsedMs - note.targetMs > HIT_WINDOW_MS;
    });

    if (missedNote) {
      this.endGame("遅かった！", missedNote);
    }
  },

  clearGame: function() {
    this.playing = false;
    this.gameOver = false;
    this.cleared = true;
    this.paused = false;
    // this.pauseButton.text = "PAUSE";
    this.pauseTimeLabel.text = "";
    this.stopMouthTalk();

    // SoundManager側では自然終了済みなので、ここではstopMusic()しない。
    this.clearNotes();
    this.messageLabel.text = "クリア！";
    this.hitButton.text = "REPLAY";
    this.hitButton.alpha = 1;
    this.mainButtonPressMode = "start";
  },

  endGame: function(reason, missedNote) {
    this.playing = false;
    this.gameOver = true;
    this.paused = false;
    // this.pauseButton.text = "PAUSE";
    this.pauseTimeLabel.text = "";
    this.stopMouthTalk();
    SoundManager.stopMusic();

    // GAME OVER時はノーツを消さない。
    // 原因になったノーツだけ赤色にして、どこで失敗したか残す。
    if (missedNote) {
      missedNote.fill = "#d93636";
      missedNote.stroke = "#ffb0b0";
      missedNote.scaleX = 1.15;
      missedNote.scaleY = 1.15;
    }

    this.messageLabel.text = "GAME OVER  " + reason;
    this.hitButton.text = "RETRY";
    this.hitButton.alpha = 1;
  },

  clearNotes: function() {
    this.noteSprites.forEach(function(note) {
      note.remove();
    });
    this.noteSprites = [];
  },
});

phina.main(function() {
  const app = GameApp({
    startLabel: "main",
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT,
    assets: ASSETS,
  });

  app.run();
});
