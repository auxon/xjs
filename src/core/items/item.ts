/// <reference path="../../../defs/es6-promise.d.ts" />

import {applyMixins} from '../../internal/util/mixin';
import {Rectangle} from '../../util/rectangle';
import {Item as iItem} from '../../internal/item';
import {App as iApp} from '../../internal/app';
import {Environment} from '../environment';
import {JSON as JXON} from '../../internal/util/json';
import {XML} from '../../internal/util/xml';
import {Scene} from '../scene';
import {ItemLayout, IItemLayout} from './ilayout';
import {
  minVersion,
  versionCompare,
  getVersion,
  globalsrcMinVersion
} from '../../internal/util/version';

import {iSource, ISource} from '../source/isource';
import {Source} from '../source/source'
import {GameSource} from '../source/game';
import {CameraSource} from '../source/camera';
import {AudioSource} from '../source/audio';
import {VideoPlaylistSource} from '../source/videoplaylist'
import {HtmlSource} from '../source/html';
import {FlashSource} from '../source/flash';
import {ScreenSource} from '../source/screen';
import {ImageSource} from '../source/image';
import {MediaSource} from '../source/media';

export enum ItemTypes {
  UNDEFINED,
  FILE,
  LIVE,
  TEXT,
  BITMAP,
  SCREEN,
  FLASHFILE,
  GAMESOURCE,
  HTML
}

export enum ViewTypes {
  MAIN,
  PREVIEW,
  THUMBNAIL
}

/**
 * An `Item` represents an object that is used as a item on the stage.
 * Some possible items are games, microphones, or a webpage.
 *
 * Implements: {@link #core/IItemLayout Core/IItemLayout}
 *
 * ### Basic Usage
 *
 * ```javascript
 * var xjs = require('xjs');
 * var Scene = xjs.Scene.getById(0);
 *
 * Scene.getItems().then(function(items) {
 *   if (items.length === 0) return;
 *
 *   // There's a valid item, let's use that
 *   var item = items[items.length - 1];
 *   return item.setCustomName('ItemTesting');
 * }).then(function(item) {
 *   // Do something else here
 * });
 * ```
 * All methods marked as *Chainable* resolve with the original `Item` instance.
 * This allows you to perform sequential operations correctly:
 * ```javascript
 * var xjs = require('xjs');
 * var Item = xjs.Item;
 *
 * // an item that sets its own properties on load
 * xjs.ready()
 *    .then(Item.getItemList)
 *    .then(function(item) {
 *     return item.setCustomName('MyCustomName');
 *  }).then(function(item) {
 *     return item.setKeepLoaded(true);
 *  }).then(function(item) {
 *     // set more properties here
 *  });
 * ```
 */
export class Item extends Source implements IItemLayout, ISource {
  constructor(props?: {}) {
    super(props)
    this._isItemCall = true;
  }

  /**
   * return: Promise<ItemTypes>
   *
   * Get the type of the item
   *
   * #### Usage
   *
   * ```javascript
   * item.getType().then(function(type) {
   *   // The rest of your code here
   * });
   * ```
   */
  getType(): Promise<ItemTypes> {
    return new Promise(resolve => {
      iItem.get('prop:type', this._id).then(val => {
        this._type = ItemTypes[ItemTypes[Number(val)]];
        resolve(this._type);
      });
    });
  }

  /**
   * return: Promise<string>
   *
   * Get the ID of the item
   *
   * #### Usage
   *
   * ```javascript
   * item.getId().then(function(id) {
   *   // The rest of your code here
   * });
   * ```
   */
  getId(): Promise<string> {
    return new Promise(resolve => {
      resolve(this._id);
    });
  }

  /**
   * return: Promise<number>
   *
   * Get (1-indexed) Scene ID where the item is loaded
   *
   * #### Usage
   *
   * ```javascript
   * item.getSceneId().then(function(id) {
   *   // The rest of your code here
   * });
   * ```
   */
  getSceneId(): Promise<number> {
    return new Promise(resolve => {
      resolve(Number(this._sceneId) + 1);
    });
  }

  /**
   * return: Promise<ViewTypes>
   *
   * Get the view type of the item
   *
   * #### Usage
   *
   * ```javascript
   * item.getView().then(function(view) {
   *   // view values:
   *   // 0 = main view
   *   // 1 = preview editor
   *   // 2 = thumbnail preview
   * })
   * ```
   */
  getView() {
    return new Promise(resolve => {
      iItem.get('prop:viewid', this._id).then(viewId => {
        let view = ViewTypes.MAIN;
        if (viewId === '1') {
          const preview = iApp.getGlobalProperty('preview_editor_opened')
          view = preview === '1' ? ViewTypes.PREVIEW : ViewTypes.THUMBNAIL;
        }
        resolve(view);
      });
    })
  }

  /**
   * return: XML
   *
   * Convert the Item object to an XML object. Use `toString()` to
   * get the string version of the returned object.
   *
   * #### Usage
   *
   * ```javascript
   * var xml = item.toXML();
   * ```
   */
  toXML(): XML {
    var item: JXON = new JXON();

    for (let prop in this._xmlparams) {
      if (!{}.hasOwnProperty.call(this._xmlparams, prop)) continue;

      item[prop] = this._xmlparams[prop];
    }

    item['tag'] = 'item';
    item['selfclosing'] = true;

    return XML.parseJSON(item);
  }

  /**
   * return: Promise<Item[]>
   *
   * Get the item list of the attached item. This is useful when an item is
   * an instance of a linked item, with multiple other items having the same
   * source.
   *
   * #### Usage
   *
   * ```javascript
   * // item pertains to an actual item instance
   * item.getItemList().then(function(item) {
   *   // This will fetch the item list of the current item
   * }).catch(function(err) {
   *   // Handle the error here. Errors would only occur
   *   // if we try to execute this method on Extension plugins
   * });
   * ```
   */
  getItemList(): Promise<Item[]> {
    return new Promise((resolve, reject) => {
      if (
        versionCompare(getVersion())
          .is
          .lessThan(minVersion)
      ) {
        Scene.searchItemsById(this._id).then(item => {
          const itemArray = [];
          itemArray.push(item);
          resolve(itemArray);
        });
      } else {
        iItem.get('itemlist', this._id).then(itemlist => {
          const promiseArray: Promise<Item>[] = [];
          const itemsArray = itemlist.split(',');

          itemsArray.forEach(itemId => {
            promiseArray.push(new Promise(itemResolve => {
              Scene.searchItemsById(itemId).then(item => {
                itemResolve(item);
              }).catch(() => itemResolve(null));
            }));
          });

          Promise.all(promiseArray).then(results => {
            resolve(results.filter(res => res !== null));
          });
        });
      }
    })
  }

  /**
   * param: (options: {linked:<boolean>, scene<Scene> } | null)
   * ```
   * return: Promise<Item>
   * ```
   * Duplicate current item. Will duplicate item into the current scene
   * or specified scene
   *
   *  *Chainable*
   *
   * #### Usage
   * ```javascript
   * xjs.Item.getItemList().then(function(item){
   *   // get a scene to place duplicate on
   *   item.duplicate(); // Default is linked: false, scene: current scene
   * });
   *
   * ```
   */

  duplicate(options: { linked: boolean, scene: Scene }): Promise<Item> {
    return new Promise((resolve, reject) => {
      if(versionCompare(getVersion())
        .is
        .lessThan(globalsrcMinVersion)) {
        iApp.callFunc('additem', this.toXML().toString()).then(() => {
          resolve(this)
        })
      } else {
        if(options){
          if(options.linked) {
            iItem.set('prop:keeploaded', '1', this._id)
          }
          if(options.scene !== undefined && options.linked !== undefined) {
            if(options.scene instanceof Scene) {
              options.scene.getSceneNumber().then((id) => {
                iApp.callFunc(`link:${options.linked ? 1 : 0}|s:${id}|additem`,
                this.toXML().toString())
                  .then(() => {
                  resolve(this);
                });
              })
            } else {
              reject(Error('Invalid parameters'));
            }
          } else if(options.linked === undefined) {
            if(options.scene instanceof Scene) {
              options.scene.getSceneNumber().then((id) => {
                iApp.callFunc(`link:0|s:${id}|additem`,
                  this.toXML().toString())
                  .then(() => {
                  resolve(this);
                });
              })
            } else {
              reject(Error('Invalid parameters'));
            }
          } else if(options.scene === undefined) {
            iApp.callFunc(`link:${options.linked ? 1 : 0}|s:${this._sceneId}|additem`,
            this.toXML().toString())
              .then(() => {
              resolve(this);
            });
          }
        } else {
          iApp.callFunc('link:0|additem', this.toXML().toString())
              .then(() => {
              resolve(this);
            });
        }
      }
    });
  }

  /**
   * return: Promise<Item>
   *
   * Unlinks selected item to linked items
   *
   * #### Usage
   * ```javascript
   * item.unlink()
   * ```
   *
   * Note: Once you unlink an Item, there's still no method to reverses the
   * process.
   *
   */
  unlink(): Promise<Item> {
    return new Promise(resolve => {
      iItem.set('prop:globalsrc', '0', this._id)
        .then(() => {
        resolve(this)
      })
    })
  }

  static getSource(): Promise<Source> {
    let uniqueSource = [];
    let uniqueObj = {};
    let _xmlparams;
    let _type;
    let _srcId;
    var promiseArray: Promise<Source>[] = [];

    return new Promise((resolve, reject) => {
      if (Environment.isExtension()) {
        //do something or not: temp error
        reject(Error('Does not work here!'))
      } else if (
        (Environment.isSourcePlugin() || Environment.isSourceConfig())) {
        // do other here
        Item.getItemList().then((items) => {
          for(var i=0; i< items.length; i++) {
            for(var key in items[i]) {
              if(key === '_srcId') {
                uniqueObj[items[i][key]] = items[i]
              }
            }
          }

          for(var j in uniqueObj) {
            if(uniqueObj.hasOwnProperty(j)) {
              uniqueSource.push(uniqueObj[j])
            }
          }

          let typePromise = index => new Promise(typeResolve => {
            let source = uniqueSource[index];
            let params = source['_xmlparams']
            let type = Number(source['_type']);
            console.log('Param::', source, type)
            if (type === ItemTypes.GAMESOURCE) {
              typeResolve(new GameSource(params));
            } else if ((type === ItemTypes.HTML || type === ItemTypes.FILE) &&
              source['_name'].indexOf('Video Playlist') === 0 &&
              source['FilePlaylist'] !== ''){
              typeResolve(new VideoPlaylistSource(params));
            } else if (type === ItemTypes.HTML) {
              typeResolve(new HtmlSource(params));
            } else if (type === ItemTypes.SCREEN) {
              typeResolve(new ScreenSource(params));
            } else if (type === ItemTypes.BITMAP ||
                type === ItemTypes.FILE &&
                /\.gif$/.test(source['item'])) {
              typeResolve(new ImageSource(params));
            } else if (type === ItemTypes.FILE &&
                /\.(gif|xbs)$/.test(source['item']) === false &&
                /^(rtsp|rtmp):\/\//.test(source['item']) === false) {
              typeResolve(new MediaSource(params));
            } else if (Number(source['type']) === ItemTypes.LIVE &&
              source['item'].indexOf(
                '{33D9A762-90C8-11D0-BD43-00A0C911CE86}') === -1) {
              typeResolve(new CameraSource(params));
            } else if (Number(source['type']) === ItemTypes.LIVE &&
              source['item'].indexOf(
                '{33D9A762-90C8-11D0-BD43-00A0C911CE86}') !== -1) {
              typeResolve(new AudioSource(params));
            } else if (Number(source['type']) === ItemTypes.FLASHFILE) {
              typeResolve(new FlashSource(params));
            } else {
                typeResolve(new Source(params));
            }
          });

          if (Array.isArray(uniqueSource)) {
            for (var i = 0; i < uniqueSource.length; i++) {
              promiseArray.push(typePromise(i));
            }
          }

          Promise.all(promiseArray).then(results => {
            resolve(results);
          });

        })
      }
    })
  }

  // ItemLayout

  /**
   * See: {@link #core/IItemLayout#isKeepAspectRatio isKeepAspectRatio}
   */
  isKeepAspectRatio: () => Promise<boolean>;

  /**
   * See: {@link #core/IItemLayout#isPositionLocked isPositionLocked}
   */
  isPositionLocked: () => Promise<boolean>;

  /**
   * See: {@link #core/IItemLayout#isEnhancedResizeEnabled isEnhancedResizeEnabled}
   */
  isEnhancedResizeEnabled: () => Promise<boolean>;

  /**
   * See: {@link #core/IItemLayout#getCanvasRotate getCanvasRotate}
   */
  getCanvasRotate: () => Promise<number>;

  /**
   * See: {@link #core/IItemLayout#getCropping getCropping}
   */
  getCropping: () => Promise<Object>;

  /**
   * See: {@link #core/IItemLayout#getEnhancedRotate getEnhancedRotate}
   */
  getEnhancedRotate: () => Promise<number>;

  /**
   * See: {@link #core/IItemLayout#getPosition getPosition}
   */
  getPosition: () => Promise<Rectangle>;

  /**
   * See: {@link #core/IItemLayout#getRotateY getRotateY}
   */
  getRotateY: () => Promise<number>;

  /**
   * See: {@link #core/IItemLayout#getRotateX getRotateX}
   */
  getRotateX: () => Promise<number>;

  /**
   * See: {@link #core/IItemLayout#getRotateZ getRotateZ}
   */
  getRotateZ: () => Promise<number>;

  /**
   * See: {@link #core/IItemLayout#setCanvasRotate setCanvasRotate}
   */
  setCanvasRotate: (value: number) => Promise<Item>;

  /**
   * See: {@link #core/IItemLayout#setCropping setCropping}
   */
  setCropping: (value: Object) => Promise<Item>;

  /**
   * See: {@link #core/IItemLayout#setCroppingEnhanced setCroppingEnhanced}
   */
  setCroppingEnhanced: (value: Object) => Promise<Item>;

  /**
   * See: {@link #core/IItemLayout#setEnhancedRotate setEnhancedRotate}
   */
  setEnhancedRotate: (value: number) => Promise<Item>;

  /**
   * See: {@link #core/IItemLayout#setKeepAspectRatio setKeepAspectRatio}
   */
  setKeepAspectRatio: (value: boolean) => Promise<Item>;

  /**
   * See: {@link #core/IItemLayout#setPositionLocked setPositionLocked}
   */
  setPositionLocked: (value: boolean) => Promise<Item>;

  /**
   * See: {@link #core/IItemLayout#setEnhancedResizeEnabled setEnhancedResizeEnabled}
   */
  setEnhancedResizeEnabled: (value: boolean) => Promise<Item>;

  /**
   * See: {@link #core/IItemLayout#setPosition setPosition}
   */
  setPosition: (value: Rectangle) => Promise<Item>;

  /**
   * See: {@link #core/IItemLayout#setRotateY setRotateY}
   */
  setRotateY: (value: number) => Promise<Item>;

  /**
   * See: {@link #core/IItemLayout#setRotateX setRotateX}
   */
  setRotateX: (value: number) => Promise<Item>;

  /**
   * See: {@link #core/IItemLayout#setRotateZ setRotateZ}
   */
  setRotateZ: (value: number) => Promise<Item>;

  // iSource
  /**
   * See: {@link #core/Source#setName setName}
   */
  setName: (value: string) => Promise<Item>

  /**
   * See: {@link #core/Source#getName getName}
   */
  getName: () => Promise<string>

  /**
   * See: {@link #core/Source#setCustomName setCustomName}
   */
  setCustomName: () => Promise<Item>

  /**
   * See: {@link #core/Source#getCustomName getCustomName}
   */
  getCustomName: ()  => Promise<string>

  /**
   * See: {@link #core/Source#getValue getValue}
   */
  getValue: () => Promise<string | XML>

  /**
   * See: {@link #core/Source#setValue setValue}
   */
  setValue: (value: string | XML) => Promise<Item>

  /**
   * See: {@link #core/Source#getKeepLoaded getKeepLoaded}
   */
  getKeepLoaded: () => Promise<boolean>

  /**
   * See: {@link #core/Source#setKeepLoaded setKeepLoaded}
   */
  setKeepLoaded: (value: boolean) => Promise<Item>

  /**
   * See: {@link #core/Source#getSourceId getSourceId}
   */
  getSourceId: () => Promise<string>

  /**
   * See: {@link #core/Source#refresh refresh}
   */
  refresh: () => Promise<Source>

}

applyMixins(Item, [iSource, ItemLayout]);
