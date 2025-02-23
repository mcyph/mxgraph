/**
 * Copyright (c) 2006-2015, JGraph Ltd
 * Copyright (c) 2006-2015, Gaudenz Alder
 * Updated to ES9 syntax by David Morrissey 2021
 * Type definitions from the typed-mxgraph project
 */

import { hasScrollbars } from '../../util/Utils';
import EventObject from '../event/EventObject';

/**
 * Class: mxPanningManager
 *
 * Implements a handler for panning.
 */
class PanningManager {
  constructor(graph) {
    this.thread = null;
    this.active = false;
    this.tdx = 0;
    this.tdy = 0;
    this.t0x = 0;
    this.t0y = 0;
    this.dx = 0;
    this.dy = 0;
    this.scrollbars = false;
    this.scrollLeft = 0;
    this.scrollTop = 0;

    this.mouseListener = {
      mouseDown: (sender, me) => {},
      mouseMove: (sender, me) => {},
      mouseUp: (sender, me) => {
        if (this.active) {
          this.stop();
        }
      },
    };

    graph.addMouseListener(this.mouseListener);

    this.mouseUpListener = () => {
      if (this.active) {
        this.stop();
      }
    };

    // Stops scrolling on every mouseup anywhere in the document
    mxEvent.addListener(document, 'mouseup', this.mouseUpListener);

    const createThread = () => {
      this.scrollbars = hasScrollbars(graph.container);
      this.scrollLeft = graph.container.scrollLeft;
      this.scrollTop = graph.container.scrollTop;

      return window.setInterval(() => {
        this.tdx -= this.dx;
        this.tdy -= this.dy;

        if (this.scrollbars) {
          const left = -graph.container.scrollLeft - Math.ceil(this.dx);
          const top = -graph.container.scrollTop - Math.ceil(this.dy);
          graph.panGraph(left, top);
          graph.panDx = this.scrollLeft - graph.container.scrollLeft;
          graph.panDy = this.scrollTop - graph.container.scrollTop;
          graph.fireEvent(new EventObject(mxEvent.PAN));
          // TODO: Implement graph.autoExtend
        } else {
          graph.panGraph(this.getDx(), this.getDy());
        }
      }, this.delay);
    };

    this.isActive = () => {
      return this.active;
    };

    this.getDx = () => {
      return Math.round(this.tdx);
    };

    this.getDy = () => {
      return Math.round(this.tdy);
    };

    this.start = () => {
      this.t0x = graph.view.translate.x;
      this.t0y = graph.view.translate.y;
      this.active = true;
    };

    this.panTo = (x, y, w, h) => {
      if (!this.active) {
        this.start();
      }

      this.scrollLeft = graph.container.scrollLeft;
      this.scrollTop = graph.container.scrollTop;

      w = w != null ? w : 0;
      h = h != null ? h : 0;

      const c = graph.container;
      this.dx = x + w - c.scrollLeft - c.clientWidth;

      if (this.dx < 0 && Math.abs(this.dx) < this.border) {
        this.dx = this.border + this.dx;
      } else if (this.handleMouseOut) {
        this.dx = Math.max(this.dx, 0);
      } else {
        this.dx = 0;
      }

      if (this.dx == 0) {
        this.dx = x - c.scrollLeft;

        if (this.dx > 0 && this.dx < this.border) {
          this.dx -= this.border;
        } else if (this.handleMouseOut) {
          this.dx = Math.min(0, this.dx);
        } else {
          this.dx = 0;
        }
      }

      this.dy = y + h - c.scrollTop - c.clientHeight;

      if (this.dy < 0 && Math.abs(this.dy) < this.border) {
        this.dy = this.border + this.dy;
      } else if (this.handleMouseOut) {
        this.dy = Math.max(this.dy, 0);
      } else {
        this.dy = 0;
      }

      if (this.dy == 0) {
        this.dy = y - c.scrollTop;

        if (this.dy > 0 && this.dy < this.border) {
          this.dy -= this.border;
        } else if (this.handleMouseOut) {
          this.dy = Math.min(0, this.dy);
        } else {
          this.dy = 0;
        }
      }

      if (this.dx != 0 || this.dy != 0) {
        this.dx *= this.damper;
        this.dy *= this.damper;

        if (this.thread == null) {
          this.thread = createThread();
        }
      } else if (this.thread != null) {
        window.clearInterval(this.thread);
        this.thread = null;
      }
    };

    this.stop = () => {
      if (this.active) {
        this.active = false;

        if (this.thread != null) {
          window.clearInterval(this.thread);
          this.thread = null;
        }

        this.tdx = 0;
        this.tdy = 0;

        if (!this.scrollbars) {
          const px = graph.panDx;
          const py = graph.panDy;

          if (px != 0 || py != 0) {
            graph.panGraph(0, 0);
            graph.view.setTranslate(
              this.t0x + px / graph.view.scale,
              this.t0y + py / graph.view.scale
            );
          }
        } else {
          graph.panDx = 0;
          graph.panDy = 0;
          graph.fireEvent(new EventObject(mxEvent.PAN));
        }
      }
    };

    this.destroy = () => {
      graph.removeMouseListener(this.mouseListener);
      mxEvent.removeListener(document, 'mouseup', this.mouseUpListener);
    };
  }

  /**
   * Variable: damper
   *
   * Damper value for the panning. Default is 1/6.
   */
  // damper: number;
  damper = 1 / 6;

  /**
   * Variable: delay
   *
   * Delay in milliseconds for the panning. Default is 10.
   */
  // delay: number;
  delay = 10;

  /**
   * Variable: handleMouseOut
   *
   * Specifies if mouse events outside of the component should be handled. Default is true.
   */
  // handleMouseOut: boolean;
  handleMouseOut = true;

  /**
   * Variable: border
   *
   * Border to handle automatic panning inside the component. Default is 0 (disabled).
   */
  // border: number;
  border = 0;
}

export default PanningManager;
