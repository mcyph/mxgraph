/**
 * Copyright (c) 2006-2015, JGraph Ltd
 * Copyright (c) 2006-2015, Gaudenz Alder
 * Updated to ES9 syntax by David Morrissey 2021
 * Type definitions from the typed-mxgraph project
 */
import EventSource from '../../view/event/EventSource';
import utils, { fit, getDocumentScrollOrigin } from '../Utils';
import EventObject from '../../view/event/EventObject';
import mxClient from '../../mxClient';
import InternalEvent from '../../view/event/InternalEvent';
import { write } from '../DomUtils';
import { isLeftMouseButton } from '../EventUtils';

/**
 * Class: mxPopupMenu
 *
 * Basic popup menu. To add a vertical scrollbar to a given submenu, the
 * following code can be used.
 *
 * (code)
 * let mxPopupMenuShowMenu = showMenu;
 * showMenu = ()=>
 * {
 *   mxPopupMenuShowMenu.apply(this, arguments);
 *
 *   this.div.style.overflowY = 'auto';
 *   this.div.style.overflowX = 'hidden';
 *   this.div.style.maxHeight = '160px';
 * };
 * (end)
 *
 * Constructor: mxPopupMenu
 *
 * Constructs a popupmenu.
 *
 * Event: mxEvent.SHOW
 *
 * Fires after the menu has been shown in <popup>.
 */
class mxPopupMenu extends EventSource {
  constructor(factoryMethod) {
    super();
    this.factoryMethod = factoryMethod;

    if (factoryMethod != null) {
      this.init();
    }
  }

  /**
   * Function: init
   *
   * Initializes the shapes required for this vertex handler.
   */
  // init(): void;
  init() {
    // Adds the inner table
    this.table = document.createElement('table');
    this.table.className = 'mxPopupMenu';

    this.tbody = document.createElement('tbody');
    this.table.appendChild(this.tbody);

    // Adds the outer div
    this.div = document.createElement('div');
    this.div.className = 'mxPopupMenu';
    this.div.style.display = 'inline';
    this.div.style.zIndex = this.zIndex;
    this.div.appendChild(this.table);

    // Disables the context menu on the outer div
    InternalEvent.disableContextMenu(this.div);
  }

  /**
   * Variable: submenuImage
   *
   * URL of the image to be used for the submenu icon.
   */
  // submenuImage: string;
  submenuImage = `${mxClient.imageBasePath}/submenu.gif`;

  /**
   * Variable: zIndex
   *
   * Specifies the zIndex for the popupmenu and its shadow. Default is 1006.
   */
  // zIndex: number;
  zIndex = 10006;

  /**
   * Variable: factoryMethod
   *
   * Function that is used to create the popup menu. The function takes the
   * current panning handler, the <mxCell> under the mouse and the mouse
   * event that triggered the call as arguments.
   */
  // factoryMethod: (handler: mxPopupMenuHandler, cell: mxCell, me: mxMouseEvent) => any;
  factoryMethod = null;

  /**
   * Variable: useLeftButtonForPopup
   *
   * Specifies if popupmenus should be activated by clicking the left mouse
   * button. Default is false.
   */
  // useLeftButtonForPopup: boolean;
  useLeftButtonForPopup = false;

  /**
   * Variable: enabled
   *
   * Specifies if events are handled. Default is true.
   */
  // enabled: boolean;
  enabled = true;

  /**
   * Variable: itemCount
   *
   * Contains the number of times <addItem> has been called for a new menu.
   */
  // itemCount: number;
  itemCount = 0;

  /**
   * Variable: autoExpand
   *
   * Specifies if submenus should be expanded on mouseover. Default is false.
   */
  // autoExpand: boolean;
  autoExpand = false;

  /**
   * Variable: smartSeparators
   *
   * Specifies if separators should only be added if a menu item follows them.
   * Default is false.
   */
  // smartSeparators: boolean;
  smartSeparators = false;

  /**
   * Variable: labels
   *
   * Specifies if any labels should be visible. Default is true.
   */
  // labels: boolean;
  labels = true;

  /**
   * Function: isEnabled
   *
   * Returns true if events are handled. This implementation
   * returns <enabled>.
   */
  // isEnabled(): boolean;
  isEnabled() {
    return this.enabled;
  }

  /**
   * Function: setEnabled
   *
   * Enables or disables event handling. This implementation
   * updates <enabled>.
   */
  // setEnabled(enabled: boolean): void;
  setEnabled(enabled) {
    this.enabled = enabled;
  }

  /**
   * Function: isPopupTrigger
   *
   * Returns true if the given event is a popupmenu trigger for the optional
   * given cell.
   *
   * Parameters:
   *
   * me - <mxMouseEvent> that represents the mouse event.
   */
  // isPopupTrigger(me: mxMouseEvent): boolean;
  isPopupTrigger(me) {
    return (
      me.isPopupTrigger() ||
      (this.useLeftButtonForPopup && isLeftMouseButton(me.getEvent()))
    );
  }

  /**
   * Function: addItem
   *
   * Adds the given item to the given parent item. If no parent item is specified
   * then the item is added to the top-level menu. The return value may be used
   * as the parent argument, ie. as a submenu item. The return value is the table
   * row that represents the item.
   *
   * Paramters:
   *
   * title - String that represents the title of the menu item.
   * image - Optional URL for the image icon.
   * funct - Function associated that takes a mouseup or touchend event.
   * parent - Optional item returned by <addItem>.
   * iconCls - Optional string that represents the CSS class for the image icon.
   * IconsCls is ignored if image is given.
   * enabled - Optional boolean indicating if the item is enabled. Default is true.
   * active - Optional boolean indicating if the menu should implement any event handling.
   * Default is true.
   * noHover - Optional boolean to disable hover state.
   */
  addItem(title, image, funct, parent, iconCls, enabled, active, noHover) {
    parent = parent || this;
    this.itemCount++;

    // Smart separators only added if element contains items
    if (parent.willAddSeparator) {
      if (parent.containsItems) {
        this.addSeparator(parent, true);
      }

      parent.willAddSeparator = false;
    }

    parent.containsItems = true;
    const tr = document.createElement('tr');
    tr.className = 'mxPopupMenuItem';
    const col1 = document.createElement('td');
    col1.className = 'mxPopupMenuIcon';

    // Adds the given image into the first column
    if (image != null) {
      const img = document.createElement('img');
      img.src = image;
      col1.appendChild(img);
    } else if (iconCls != null) {
      const div = document.createElement('div');
      div.className = iconCls;
      col1.appendChild(div);
    }

    tr.appendChild(col1);

    if (this.labels) {
      const col2 = document.createElement('td');
      col2.className = `mxPopupMenuItem${
        enabled != null && !enabled ? ' mxDisabled' : ''
      }`;

      write(col2, title);
      col2.align = 'left';
      tr.appendChild(col2);

      const col3 = document.createElement('td');
      col3.className = `mxPopupMenuItem${
        enabled != null && !enabled ? ' mxDisabled' : ''
      }`;
      col3.style.paddingRight = '6px';
      col3.style.textAlign = 'right';

      tr.appendChild(col3);

      if (parent.div == null) {
        this.createSubmenu(parent);
      }
    }

    parent.tbody.appendChild(tr);

    if (active != false && enabled != false) {
      let currentSelection = null;

      InternalEvent.addGestureListeners(
        tr,
        evt => {
          this.eventReceiver = tr;

          if (parent.activeRow != tr && parent.activeRow != parent) {
            if (
              parent.activeRow != null &&
              parent.activeRow.div.parentNode != null
            ) {
              this.hideSubmenu(parent);
            }

            if (tr.div != null) {
              this.showSubmenu(parent, tr);
              parent.activeRow = tr;
            }
          }

          InternalEvent.consume(evt);
        },
        evt => {
          if (parent.activeRow != tr && parent.activeRow != parent) {
            if (
              parent.activeRow != null &&
              parent.activeRow.div.parentNode != null
            ) {
              this.hideSubmenu(parent);
            }

            if (this.autoExpand && tr.div != null) {
              this.showSubmenu(parent, tr);
              parent.activeRow = tr;
            }
          }

          // Sets hover style because TR in IE doesn't have hover
          if (!noHover) {
            tr.className = 'mxPopupMenuItemHover';
          }
        },
        evt => {
          // EventReceiver avoids clicks on a submenu item
          // which has just been shown in the mousedown
          if (this.eventReceiver == tr) {
            if (parent.activeRow != tr) {
              this.hideMenu();
            }

            // Workaround for lost current selection in page because of focus in IE
            if (currentSelection != null) {
              // Workaround for "unspecified error" in IE8 standards
              try {
                currentSelection.select();
              } catch (e) {
                // ignore
              }

              currentSelection = null;
            }

            if (funct != null) {
              funct(evt);
            }
          }

          this.eventReceiver = null;
          InternalEvent.consume(evt);
        }
      );

      // Resets hover style because TR in IE doesn't have hover
      if (!noHover) {
        InternalEvent.addListener(tr, 'mouseout', evt => {
          tr.className = 'mxPopupMenuItem';
        });
      }
    }

    return tr;
  }

  /**
   * Adds a checkmark to the given menuitem.
   */
  // addCheckmark(item: Element, img: string): void;
  addCheckmark(item, img) {
    const td = item.firstChild.nextSibling;
    td.style.backgroundImage = `url('${img}')`;
    td.style.backgroundRepeat = 'no-repeat';
    td.style.backgroundPosition = '2px 50%';
  }

  /**
   * Function: createSubmenu
   *
   * Creates the nodes required to add submenu items inside the given parent
   * item. This is called in <addItem> if a parent item is used for the first
   * time. This adds various DOM nodes and a <submenuImage> to the parent.
   *
   * Parameters:
   *
   * parent - An item returned by <addItem>.
   */
  // createSubmenu(parent: Element): void;
  createSubmenu(parent) {
    parent.table = document.createElement('table');
    parent.table.className = 'mxPopupMenu';

    parent.tbody = document.createElement('tbody');
    parent.table.appendChild(parent.tbody);

    parent.div = document.createElement('div');
    parent.div.className = 'mxPopupMenu';

    parent.div.style.position = 'absolute';
    parent.div.style.display = 'inline';
    parent.div.style.zIndex = this.zIndex;

    parent.div.appendChild(parent.table);

    const img = document.createElement('img');
    img.setAttribute('src', this.submenuImage);

    // Last column of the submenu item in the parent menu
    td = parent.firstChild.nextSibling.nextSibling;
    td.appendChild(img);
  }

  /**
   * Function: showSubmenu
   *
   * Shows the submenu inside the given parent row.
   */
  // showSubmenu(parent: Element, row: Element): void;
  showSubmenu(parent, row) {
    if (row.div != null) {
      row.div.style.left = `${parent.div.offsetLeft +
        row.offsetLeft +
        row.offsetWidth -
        1}px`;
      row.div.style.top = `${parent.div.offsetTop + row.offsetTop}px`;
      document.body.appendChild(row.div);

      // Moves the submenu to the left side if there is no space
      const left = parseInt(row.div.offsetLeft);
      const width = parseInt(row.div.offsetWidth);
      const offset = getDocumentScrollOrigin(document);

      const b = document.body;
      const d = document.documentElement;

      const right = offset.x + (b.clientWidth || d.clientWidth);

      if (left + width > right) {
        row.div.style.left = `${Math.max(
          0,
          parent.div.offsetLeft - width - 6
        )}px`;
      }

      fit(row.div);
    }
  }

  /**
   * Function: addSeparator
   *
   * Adds a horizontal separator in the given parent item or the top-level menu
   * if no parent is specified.
   *
   * Parameters:
   *
   * parent - Optional item returned by <addItem>.
   * force - Optional boolean to ignore <smartSeparators>. Default is false.
   */
  // addSeparator(parent?: Element, force?: boolean): void;
  addSeparator(parent, force) {
    parent = parent || this;

    if (this.smartSeparators && !force) {
      parent.willAddSeparator = true;
    } else if (parent.tbody != null) {
      parent.willAddSeparator = false;
      const tr = document.createElement('tr');

      const col1 = document.createElement('td');
      col1.className = 'mxPopupMenuIcon';
      col1.style.padding = '0 0 0 0px';

      tr.appendChild(col1);

      const col2 = document.createElement('td');
      col2.style.padding = '0 0 0 0px';
      col2.setAttribute('colSpan', '2');

      const hr = document.createElement('hr');
      hr.setAttribute('size', '1');
      col2.appendChild(hr);

      tr.appendChild(col2);

      parent.tbody.appendChild(tr);
    }
  }

  /**
   * Function: popup
   *
   * Shows the popup menu for the given event and cell.
   *
   * Example:
   *
   * (code)
   * graph.panningHandler.popup(x, y, cell, evt)
   * {
   *   mxUtils.alert('Hello, World!');
   * }
   * (end)
   */
  // popup(x: number, y: number, cell: mxCell, evt: Event): void;
  popup(x, y, cell, evt) {
    if (this.div != null && this.tbody != null && this.factoryMethod != null) {
      this.div.style.left = `${x}px`;
      this.div.style.top = `${y}px`;

      // Removes all child nodes from the existing menu
      while (this.tbody.firstChild != null) {
        InternalEvent.release(this.tbody.firstChild);
        this.tbody.removeChild(this.tbody.firstChild);
      }

      this.itemCount = 0;
      this.factoryMethod(this, cell, evt);

      if (this.itemCount > 0) {
        this.showMenu();
        this.fireEvent(new EventObject(InternalEvent.SHOW));
      }
    }
  }

  /**
   * Function: isMenuShowing
   *
   * Returns true if the menu is showing.
   */
  // isMenuShowing(): boolean;
  isMenuShowing() {
    return this.div != null && this.div.parentNode == document.body;
  }

  /**
   * Function: showMenu
   *
   * Shows the menu.
   */
  // showMenu(): void;
  showMenu() {
    // Fits the div inside the viewport
    document.body.appendChild(this.div);
    fit(this.div);
  }

  /**
   * Function: hideMenu
   *
   * Removes the menu and all submenus.
   */
  // hideMenu(): void;
  hideMenu() {
    if (this.div != null) {
      if (this.div.parentNode != null) {
        this.div.parentNode.removeChild(this.div);
      }

      this.hideSubmenu(this);
      this.containsItems = false;
      this.fireEvent(new EventObject(InternalEvent.HIDE));
    }
  }

  /**
   * Function: hideSubmenu
   *
   * Removes all submenus inside the given parent.
   *
   * Parameters:
   *
   * parent - An item returned by <addItem>.
   */
  // hideSubmenu(parent: Element): void;
  hideSubmenu(parent) {
    if (parent.activeRow != null) {
      this.hideSubmenu(parent.activeRow);

      if (parent.activeRow.div.parentNode != null) {
        parent.activeRow.div.parentNode.removeChild(parent.activeRow.div);
      }

      parent.activeRow = null;
    }
  }

  /**
   * Function: destroy
   *
   * Destroys the handler and all its resources and DOM nodes.
   */
  // destroy(): void;
  destroy() {
    if (this.div != null) {
      InternalEvent.release(this.div);

      if (this.div.parentNode != null) {
        this.div.parentNode.removeChild(this.div);
      }

      this.div = null;
    }
  }
}

export default mxPopupMenu;
