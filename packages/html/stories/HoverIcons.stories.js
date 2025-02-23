import mxgraph from '@mxgraph/core';

import { globalTypes } from '../.storybook/preview';

export default {
  title: 'Icon_Images/HoverIcons',
  argTypes: {
    ...globalTypes,
    rubberBand: {
      type: 'boolean',
      defaultValue: true
    }
  }
};

const Template = ({ label, ...args }) => {
  const {
    mxGraph, 
    mxEvent, 
    mxRubberband, 
    mxImage,
    mxRectangle,
    mxUtils,
    mxConnectionHandler
  } = mxgraph;

  const container = document.createElement('div');
  container.style.position = 'relative';
  container.style.overflow = 'hidden';
  container.style.width = `${args.width}px`;
  container.style.height = `${args.height}px`;
  container.style.background = 'url(/images/grid.gif)';
  container.style.cursor = 'default';

  // Defines an icon for creating new connections in the connection handler.
  // This will automatically disable the highlighting of the source vertex.
  mxConnectionHandler.prototype.connectImage = new mxImage(
    'images/connector.gif',
    16,
    16
  );

  // Defines a new class for all icons
  class mxIconSet {
    constructor(state) {
      this.images = [];
      const { graph } = state.view;

      // Icon1
      let img = mxUtils.createImage('images/copy.png');
      img.setAttribute('title', 'Duplicate');
      Object.assign(img.style, {
        cursor: 'pointer',
        width: '16px',
        height: '16px',
        position: 'absolute',
        left: `${state.x + state.width}px`,
        top: `${state.y + state.height}px`,
      });

      mxEvent.addGestureListeners(img, evt => {
        const s = graph.gridSize;
        graph.setSelectionCells(graph.moveCells([state.cell], s, s, true));
        mxEvent.consume(evt);
        this.destroy();
      });

      state.view.graph.container.appendChild(img);
      this.images.push(img);

      // Delete
      img = mxUtils.createImage('images/delete2.png');
      img.setAttribute('title', 'Delete');
      Object.assign(img.style, {
        cursor: 'pointer',
        width: '16px',
        height: '16px',
        position: 'absolute',
        left: `${state.x + state.width}px`,
        top: `${state.y - 16}px`,
      });

      mxEvent.addGestureListeners(img, evt => {
        // Disables dragging the image
        mxEvent.consume(evt);
      });

      mxEvent.addListener(img, 'click', evt => {
        graph.removeCells([state.cell]);
        mxEvent.consume(evt);
        this.destroy();
      });

      state.view.graph.container.appendChild(img);
      this.images.push(img);
    }

    destroy() {
      if (this.images != null) {
        for (const img of this.images) {
          img.parentNode.removeChild(img);
        }
      }
      this.images = null;
    }
  }

  // Creates the graph inside the given container
  const graph = new mxGraph(container);
  graph.setConnectable(true);

  // Enables rubberband selection
  if (args.rubberBand)
    new mxRubberband(graph);

  // Defines the tolerance before removing the icons
  const ICON_TOLERANCE = 20;

  // Shows icons if the mouse is over a cell
  graph.addMouseListener({
    currentState: null,
    currentIconSet: null,

    mouseDown(sender, me) {
      // Hides icons on mouse down
      if (this.currentState != null) {
        this.dragLeave(me.getEvent(), this.currentState);
        this.currentState = null;
      }
    },

    mouseMove(sender, me) {
      if (
        this.currentState != null &&
        (me.getState() === this.currentState || me.getState() == null)
      ) {
        const tol = ICON_TOLERANCE;
        const tmp = new mxRectangle(
          me.getGraphX() - tol,
          me.getGraphY() - tol,
          2 * tol,
          2 * tol
        );
        if (mxUtils.intersects(tmp, this.currentState)) {
          return;
        }
      }

      let tmp = graph.view.getState(me.getCell());

      // Ignore everything but vertices
      if (
        graph.isMouseDown ||
        (tmp != null && !tmp.cell.isVertex())
      ) {
        tmp = null;
      }

      if (tmp !== this.currentState) {
        if (this.currentState != null) {
          this.dragLeave(me.getEvent(), this.currentState);
        }

        this.currentState = tmp;
        if (this.currentState != null) {
          this.dragEnter(me.getEvent(), this.currentState);
        }
      }
    },

    mouseUp(sender, me) {},

    dragEnter(evt, state) {
      if (this.currentIconSet == null) {
        this.currentIconSet = new mxIconSet(state);
      }
    },

    dragLeave(evt, state) {
      if (this.currentIconSet != null) {
        this.currentIconSet.destroy();
        this.currentIconSet = null;
      }
    },
  });

  // Gets the default parent for inserting new cells. This
  // is normally the first child of the root (ie. layer 0).
  const parent = graph.getDefaultParent();

  // Adds cells to the model in a single step
  graph.batchUpdate(() => {
    const v1 = graph.insertVertex({
      parent,
      value: 'Hello,',
      position: [20, 20],
      size: [80, 30],
    });
    const v2 = graph.insertVertex({
      parent,
      value: 'World!',
      position: [200, 150],
      size: [80, 30],
    });
    const e1 = graph.insertEdge({
      parent,
      source: v1,
      target: v2,
    });
  });

  return container;
}

export const Default = Template.bind({});