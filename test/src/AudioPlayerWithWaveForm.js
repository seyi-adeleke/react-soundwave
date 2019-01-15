
import React, { Component } from 'react';
import ReactHowler from 'react-howler';
import PropTypes from 'prop-types';

import { PlayButton, Timer } from 'react-soundplayer/components';
import webAudioBuilder from 'waveform-data/webaudio';
import Waveform from 'react-audio-waveform';

// https://github.com/bbc/waveform-data.js/tree/64967ad58aac527642be193eee916698df521efa
const audioContext = new AudioContext();

const WHITE = '#FFFFFF';

const WAVEFORM_STYLES = {
  flex: 1,
  overflow: 'hidden'
};

class AudioPlayerWithWaveForm extends Component {
    state = {
      playing: false,
      currentTime: 0,
      speedup: false,
      loadErr: false,
      duration: 0,
      peaks: []
    }

    seek = (secs, play) => {
        if (secs && secs.seek != null) {
          secs = secs.seek();
        }
        this.player.seek(secs);

        let toSet = { currentTime: secs };
        if (play) {
          toSet = {
            ...toSet,
            playing: true
          };
        }
        this.setState(toSet);
    }

    toggleRate = () => {
        let { speedup } = this.state;
        speedup = !speedup;
        this.setState({ speedup });
        this.player._howler.rate(speedup ? 2.0 : 1.0);
    }

    getSeek() {
      if (this.playerInterval) {
        clearInterval(this.playerInterval);
      }
      this.playerInterval = setInterval(() => {
          if (this.player) {
              let currentTime = this.player.seek();
              const duration = this.player.duration();
              const toSet = { currentTime };
              if (!this.state.duration && duration !== null) {
                  toSet.duration = duration;
              }
              if (duration != null) toSet.loadErr = false;
              if (currentTime >= duration) {
                  this.player.stop();
                  toSet.playing = false;
                  currentTime = 0;
              }
              this.setState(toSet);
          }
      }, 250);
    }

    componentWillUnmount() {
        if (this.playerInterval) {
          clearTimeout(this.playerInterval);
        }
    }


    componentDidMount() {
      fetch(this.props.mp3url)
        .then(response => response.arrayBuffer())
        .then(buffer => {
          webAudioBuilder(audioContext, buffer, (err, waveform) => {
            if (err) {
              return;
            }
           waveform.resample({ scale: waveform.adapter.scale  });
           console.log(waveform.max);
            this.setState({
              duration: waveform.duration,
              peaks: waveform.max
            }, () =>  this.getSeek());
          });
        });
    }

    // event handler for the click event on the waveform
    handleClick = (seconds) => {
      this.setState({
        currentTime: seconds
      }, () => {
        this.seek(seconds, this.state.playing);
      });
    }

    // controls the `play/pause` logic
    handlePlay = () => {
      this.setState({
        playing: !this.state.playing
      });
    }


    render() {
        const { mp3url } = this.props;
        let { playing, currentTime, duration, speedup, loadErr } = this.state;
        return (
            <div className="ff-audio">
                {duration != null ? <div className="flex flex-center px2 relative z1">
                    <PlayButton
                        playing={playing}
                        onTogglePlay={this.handlePlay}
                        className="flex-none h2 mr2 button button-transparent button-grow rounded"
                    />
                    <div className="sb-soundplayer-volume mr2 flex flex-center">
                        <button onClick={this.toggleRate} className="sb-soundplayer-btn sb-soundplayer-volume-btn flex-none h2 button button-transparent button-grow rounded">
                            <img className={speedup ? 'audio-speedup' : ""} src="/pane/speedup.svg" height={35} />
                        </button>
                    </div>
                    <div style={WAVEFORM_STYLES}>
                      <Waveform
                          barWidth={1}
                          peaks={this.state.peaks}
                          height={40}
                          pos={this.state.currentTime}
                          duration={this.state.duration}
                          onClick={this.handleClick}
                          color={WHITE}
                          progressGradientColors={[[0, "#888"], [1, "#aaa"]]}
                          style={{ position: 'absolute'}}
                      />
                   </div>
                    <Timer
                        className={"timer"}
                        duration={duration}
                        currentTime={currentTime != null ? currentTime : 0}
                    />
                </div> : (loadErr ? <div style={{ padding: "5 20px" }}>Unable to load audio: {loadErr}</div> : <div className="progress"><div className="indeterminate" /></div>)
              }
                <div>
                    <ReactHowler
                        src={mp3url}
                        playing={playing}
                        loop={false}
                        onLoadError={(id, err) => {
                            console.log('Unable to load media', err);
                            this.setState({ loadErr: (err && err.message) || 'Startup error' });
                        }}
                        onLoad={() => this.getSeek()}
                        ref={(ref) => (this.player = ref)}
                    />
                </div>
            </div>
        );
    }
}

AudioPlayerWithWaveForm.propTypes = {
    mp3url: PropTypes.string.isRequired
};

export default AudioPlayerWithWaveForm;
