import React, { PureComponent, PropTypes } from 'react';
import elementResizeEvent from 'element-resize-event';

let queueHide;
let percentScroll;
let lastScroll;
let barHeight;
let isOverPanel;
let isOverBar;
let isDragg;
let barPageY;
let barTop;
let releaseScroll = false;
const minBarHeight = 30;

const getPosition = (elem, offsetParent) => {
  const offset = {
    top: elem.offsetTop,
    left: elem.offsetLeft,
  };
  const parentOffset = {
    top: offsetParent.offsetTop,
    left: offsetParent.offsetLeft,
  };

  offset.top -= parseFloat(elem.style.marginTop) || 0;
  offset.left -= parseFloat(elem.style.marginLeft) || 0;
  parentOffset.top += parseFloat(offsetParent.style.borderTopWidth) || 0;
  parentOffset.left += parseFloat(offsetParent.style.borderLeftWidth) || 0;

  return {
    top: offset.top - parentOffset.top,
    left: offset.left - parentOffset.left,
  };
};

const ScrollDecorator = options =>
  OldComponent =>
    class extends PureComponent {
      static propTypes = {
        width: PropTypes.string,
        height: PropTypes.string,
        railClass: PropTypes.string,
        wrapperClass: PropTypes.string,
        color: PropTypes.string,
        alwaysVisible: PropTypes.bool,
        railVisible: PropTypes.bool,
        barClass: PropTypes.string,
        opacity: PropTypes.number,
        borderRadius: PropTypes.string,
        size: PropTypes.string,
        railColor: PropTypes.string,
        railOpacity: PropTypes.number,
        railBorderRadius: PropTypes.string,
        allowPageScroll: PropTypes.bool,
        distance: PropTypes.string,
        wheelStep: PropTypes.number,
        disableFadeOut: PropTypes.bool,
      };

      constructor(props) {
        super(props);
        this.state = {
          height: props.height || '250px',
        };
      }

      static defaultProps = {
        width: 'auto',
        size: '8px',
        color: '#c1c1c1',
        position: 'right',
        distance: '1px',
        start: 'top',
        opacity: 1,
        alwaysVisible: false,
        disableFadeOut: false,
        railVisible: false,
        railColor: '#333',
        railOpacity: 0.2,
        railDraggable: true,
        railClass: 'slimScrollRail',
        barClass: 'slimScrollBar',
        wrapperClass: 'slimScrollDiv',
        allowPageScroll: false,
        wheelStep: 20,
        touchScrollStep: 200,
        borderRadius: '7px',
        railBorderRadius: '7px',
      };

      componentDidMount() {
        this.getBarHeight();
        // 在resize的时候重新计算高度
        window.addEventListener('resize', this.calHight);
        elementResizeEvent(this.parent, () => {
          this.calHight();
        });
      }

      componentWillUnmount() {
        elementResizeEvent.unbind(this.parent);
        window.removeEventListener('resize', this.calHight);
      }

      componentDidUpdate() {
        const { parent } = this;
        const newHeight = `${parent.offsetParent.clientHeight}px`;
        if (this.state.height !== newHeight) {
          this.calHight();
        }
      }

      calHight = () => {
        const { parent } = this;
        const newHeight = `${parent.offsetParent.clientHeight}px`;
        this.setState({
          height: newHeight,
        });
        this.hideBar();
      };

      meHover = () => {
        isOverPanel = true;
        this.showBar();
        this.hideBar();
      };

      meHoverOut = () => {
        isDragg = false;
        isOverPanel = false;
        this.hideBar();
      };

      docMousemove = e => {
        isDragg = true;
        const { bar } = this;
        const currTop = (barTop + e.pageY) - barPageY;
        bar.style.top = `${currTop}px`;
        this.scrollContent(0, getPosition(bar, bar.offsetParent).top, false);// scroll content
      };

      docMouseup = () => {
        isDragg = false;
        this.hideBar();
        document.removeEventListener('mousemove', this.docMousemove, false);
        document.removeEventListener('mouseup', this.docMouseup, false);
      };

      barHover = () => {
        isOverBar = true;
      };

      barHoverOut = () => {
        isOverBar = false;
      };

      barMouseDown = e => {
        const { bar } = this;
        isDragg = true;
        barTop = parseFloat(bar.style.top);
        barPageY = e.pageY;
        document.addEventListener('mousemove', this.docMousemove, false);
        document.addEventListener('mouseup', this.docMouseup, false);
      };

      railHover = () => {
        this.showBar();
      };

      railHoverOut = () => {
        this.hideBar();
      };

      meWheel = e => {
        if (!isOverPanel) { return; }
        let delta = 0;
        if (e.deltaY) { delta = e.deltaY / 40; }
        this.scrollContent(delta, true);
        if (e.preventDefault && !releaseScroll) { e.preventDefault(); }
      };

      scrollContent = (y, isWheel, isJump) => {
        const { wheelStep } = this.props;
        const { me, bar } = this;
        const meOuterHight = parseInt(me.style.height, 10);
        const barOuterHight = parseInt(bar.style.height, 10);
        releaseScroll = false;
        let delta = y;
        const maxTop = meOuterHight - barOuterHight;

        if (isWheel) {
          delta = parseInt(bar.style.top, 10) + (((y * parseInt(wheelStep, 10)) / 100) * barOuterHight);
          delta = Math.min(Math.max(delta, 0), maxTop);

          delta = (y > 0) ? Math.ceil(delta) : Math.floor(delta);

          bar.style.top = `${delta}px`;
        }

        percentScroll = parseInt(bar.style.top, 10) / (meOuterHight - barOuterHight);
        delta = percentScroll * (me.scrollHeight - meOuterHight);

        if (isJump) {
          delta = y;
          let offsetTop = (delta / me.scrollHeight) * meOuterHight;
          offsetTop = Math.min(Math.max(offsetTop, 0), maxTop);
          bar.style.top = `${offsetTop}px`;
        }
        me.scrollTop = delta;

        this.showBar();
        this.hideBar();
      };

      getBarHeight = () => {
        const { me, bar } = this;
        const outerHight = parseInt(me.style.height, 10);
        barHeight = Math.max((outerHight / me.scrollHeight) * outerHight, minBarHeight);
        bar.style.height = `${barHeight}px`;
        bar.style.display = barHeight === outerHight ? 'none' : 'block';
      };

      hideBar = () => {
        const { bar, rail } = this;
        const { alwaysVisible, disableFadeOut } = this.props;
        if (!alwaysVisible) {
          queueHide = setTimeout(() => {
            if (!(disableFadeOut && isOverPanel) && !isOverBar && !isDragg) {
              bar.style.display = 'none';
              rail.style.display = 'none';
            }
          }, 1000);
        }
      };

      showBar = () => {
        const { allowPageScroll, railVisible } = this.props;
        const { me, bar } = this;
        this.getBarHeight();
        clearTimeout(queueHide);

        if (percentScroll === ~~percentScroll) {  // eslint-disable-line
          releaseScroll = allowPageScroll;
        } else {
          releaseScroll = false;
        }
        lastScroll = percentScroll;

        if (barHeight >= me.style.height) {
          releaseScroll = true;
          return;
        }
        bar.style.display = 'block';
        if (railVisible) { bar.style.display = 'block'; }
      };

      render() {
        const { height } = this.state;
        const { width, railClass, wrapperClass, color, distance,
          alwaysVisible, railVisible, barClass, opacity, borderRadius,
          size, railColor, railOpacity, railBorderRadius } = this.props;
        return (
          <div
            className={wrapperClass}
            style={{
              position: 'relative',
              overflow: 'hidden',
              width,
              height,
            }}
            ref={parent => { this.parent = parent; }}
          >
            <div
              style={{
                overflow: 'hidden',
                width,
                height,
              }}
              ref={me => { this.me = me; }}
              onMouseEnter={this.meHover}
              onMouseLeave={this.meHoverOut}
              onWheel={this.meWheel}
            >
              <OldComponent
                {...this.props}
              />
            </div>
            <div
              className={barClass}
              ref={bar => { this.bar = bar; }}
              onMouseEnter={this.barHover}
              onMouseLeave={this.barHoverOut}
              onMouseDown={this.barMouseDown}
              style={{
                background: color,
                width: size,
                position: 'absolute',
                top: 0,
                opacity,
                display: alwaysVisible ? 'block' : 'none',
                borderRadius,
                BorderRadius: borderRadius,
                MozBorderRadius: borderRadius,
                WebkitBorderRadius: borderRadius,
                zIndex: 99,
                right: distance,
              }}
            />
            <div
              className={railClass}
              ref={rail => { this.rail = rail; }}
              onMouseEnter={this.railHover}
              onMouseLeave={this.railHoverOut}
              style={{
                width: size,
                height: '100%',
                position: 'absolute',
                top: 0,
                display: (alwaysVisible && railVisible) ? 'block' : 'none',
                borderRadius: railBorderRadius,
                background: railColor,
                opacity: railOpacity,
                zIndex: 90,
                right: distance,
              }}
            />
          </div>
        );
      }
    };

export default ScrollDecorator;
