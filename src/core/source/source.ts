/// <reference path="../../../defs/es6-promise.d.ts" />

import {applyMixins} from '../../internal/util/mixin';
import {ItemTypes, Item} from '../items/item'
import {Item as iItem} from '../../internal/item';
import {
  minVersion,
  versionCompare,
  getVersion
} from '../../internal/util/version';
import {XML} from '../../internal/util/xml';
import {JSON as JXON} from '../../internal/util/json';
import {Environment} from '../environment';
import {Scene} from '../scene';
import {iSource} from '../source/isource'

export class Source{
  protected _id: string;
  protected _srcId: string;
  protected _type: ItemTypes;
  protected _value: any;
  protected _name: string;
  protected _cname: string;
  protected _sceneId: number;
  protected _keepLoaded: boolean;

  protected _xmlparams: {};
  protected _isItemCall: boolean;

  constructor(props?: {}) {
    props = props ? props : {};

    this._name = props['name'];
    this._cname = props['cname'];
    this._id = props['id'];
    this._srcId = props['srcid'];
    this._sceneId = props['sceneId'];
    this._value = props['value'];
    this._keepLoaded = props['keeploaded'];
    this._type = Number(props['type']);

    this._xmlparams = props;
    this._isItemCall = false;
  }
  /**
   * return: Promise<Source>
   *
   * > #### For Deprecation
   * This method is deprecated and will be removed soon.
   * Please use {@link #core/Item#getItemList getItemList} instead.
   *
   * Get the current source (when function is called by sources), or the source
   * that was right-clicked to open the source properties window (when function is called
   * from the source properties window)
   *
   * #### Usage
   *
   * ```javascript
   * xjs.Source.getCurrentSource().then(function(source) {
   *   // This will fetch the current source (the plugin)
   * }).catch(function(err) {
   *   // Handle the error here. Errors would only occur
   *   // if we try to execute this method on Extension plugins
   * });
   * ```
   */
  static getCurrentSource(): Promise<Source> {
    return new Promise((resolve, reject) => {
      console.warn('Warning! getCurrentSource is deprecated and will be ' +
        'removed soon. Please use getItemList instead. (Only works for ' +
        'XSplit Broadcaster versions above 2.8.xxxx.xxxx');
      if (Environment.isExtension()) {
        reject(Error('Extensions do not have sources ' +
          'associated with them.'));
      } else if (
        (Environment.isSourcePlugin() || Environment.isSourceConfig()) &&
        versionCompare(getVersion())
          .is
          .greaterThan(minVersion)
      ) {
        Source.getItemList().then(items => {
          if (items.length > 0) {
            resolve(items[0]);
          } else {
            reject(Error('Cannot get item list'))
          }
        });
      } else if (Environment.isSourcePlugin() || Environment.isSourceConfig()) {
        Scene.searchItemsById(iItem.getBaseId()).then(item => {
          resolve(item);
        });
      }
    });
  }

  /**
   * return: Promise<Source[]>
   *
   * Get the Item List of the current source
   *
   * #### Usage
   *
   * ```javascript
   * xjs.Item.getItemList().then(function(item) {
   *   // This will fetch the item list of the current source
   * }).catch(function(err) {
   *   // Handle the error here. Errors would only occur
   *   // if we try to execute this method on Extension plugins
   * });
   * ```
   */
  static getItemList(): Promise<Source[]> {
    return new Promise((resolve, reject) => {
      if (Environment.isExtension()) {
        reject(Error('Extensions do not have sources associated with them.'));
      } else if (
        versionCompare(getVersion())
          .is
          .lessThan(minVersion)
      ) {
        Scene.searchItemsById(iItem.getBaseId()).then(item => {
          const itemArray = [];
          itemArray.push(item);
          resolve(itemArray);
        });
      } else if (Environment.isSourcePlugin() || Environment.isSourceConfig()) {
        iItem.get('itemlist').then(itemlist => {
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
    });
  }

  // Shared with Item
  //

  /**
   * param: (value: string)
   * ```
   * return: Promise<Source>
   * ```
   *
   * In XBC 2.8, names can be set individualy even on linked items.
   * For XBC 2.9 onwards,  name will be the same across all linked Items
   * to the same Source
   *
   * *Chainable.*
   *
   * #### Usage
   *
   * ```javascript
   * item.setName('newNameHere').then(function(item) {
   *   // Promise resolves with same Item instance when name has been set
   *   return item.getName();
   * }).then(function(name) {
   *   // 'name' should be the updated value by now.
   * });
   * ```
   */
  setName: (value: string) => Promise<Source>

  /**
   * return: Promise<string>
   *
   * Gets the name of the item.
   *
   * #### Usage
   *
   * ```javascript
   * item.getName().then(function(name) {
   *   // Do something with the name
   * });
   * ```
   */
  getName: () => Promise<string>

  /**
   * param: (value: string)
   * ```
   * return: Promise<Source>
   * ```
   *
   * In XBC 2.8, CustomName can be set individualy even on linked items.
   * For XBC 2.9 onwards, CustomName will be the same across all linked Items
   * to the same Source
   *
   * The main difference between `setName` and `setCustomName` is that the CustomName
   * can be edited by users using XBC through the bottom panel. `setName` on
   * the other hand would update the item's internal name property.
   *
   * *Chainable.*
   *
   * #### Usage
   *
   * ```javascript
   * item.setCustomName('newNameHere').then(function(item) {
   *   // Promise resolves with same Item instance when custom name has been set
   *   return item.getCustomName();
   * }).then(function(name) {
   *   // 'name' should be the updated value by now.
   * });
   * ```
   */
  setCustomName: () => Promise<Source>

  /**
   * return: Promise<string>
   *
   * Gets the custom name of the item.
   *
   * #### Usage
   *
   * ```javascript
   * item.getCustomName().then(function(name) {
   *   // Do something with the name
   * });
   * ```
   */
  getCustomName: ()  => Promise<string>

  /**
   * return: Promise<string|XML>
   *
   * Gets a special string that refers to the item's main definition.
   *
   * This method can resolve with an XML object, which is an object generated by
   * the framework. Call `toString()` to transform into an XML String. (See the
   * documentation for `setValue` for more details.)
   *
   * #### Usage
   *
   * ```javascript
   * item.getValue().then(function(value) {
   *   // Do something with the value
   * });
   * ```
   */
  getValue: () => Promise<string | XML>

  /**
   * param: (value: string)
   * ```
   * return: Promise<Source>
   * ```
   *
   * Set the item's main definition; this special string defines the item's
   * "identity". Each type of item requires a different format for this value.
   *
   * *Chainable.*
   *
   * **WARNING:**
   * Please do note that using this method COULD break the current item, possibly modifying
   * its type IF you set an invalid string for the current item.
   *
   * #### Possible values by item type
   * - FILE - path/URL
   * - LIVE - Device ID
   * - BITMAP - path
   * - SCREEN - XML string
   * - FLASHFILE - path
   * - GAMESOURCE - XML string
   * - HTML - path/URL or html:<plugin>
   *
   * #### Usage
   *
   * ```javascript
   * item.setValue('@DEVICE:PNP:\\?\USB#VID_046D&amp;PID_082C&amp;MI_02#6&amp;16FD2F8D&amp;0&amp;0002#{65E8773D-8F56-11D0-A3B9-00A0C9223196}\GLOBAL')
   *   .then(function(item) {
   *   // Promise resolves with same Item instance
   * });
   * ```
   */
  setValue: (value: string | XML) => Promise<Source>

  /**
   * return: Promise<boolean>
   *
   * Check if item is kept loaded in memory
   *
   * #### Usage
   *
   * ```javascript
   * item.getKeepLoaded().then(function(isLoaded) {
   *   // The rest of your code here
   * });
   * ```
   */
  getKeepLoaded: () => Promise<boolean>

  /**
   * param: (value: boolean)
   * ```
   * return: Promise<Source>
   * ```
   *
   * Set Keep loaded option to ON or OFF
   *
   * Items with Keep loaded set to ON would emit `scene-load` event each time
   * the active scene switches to the item's current scene.
   *
   * *Chainable.*
   *
   * #### Usage
   *
   * ```javascript
   * item.setKeepLoaded(true).then(function(item) {
   *   // Promise resolves with same Item instance
   * });
   * ```
   */
  setKeepLoaded: (value: boolean) => Promise<Source>

  /**
   * return: Promise<string>
   *
   * Get the Source ID of the item.
   * *Available only on XSplit Broadcaster verions higher than 2.8.1603.0401*
   *
   * #### Usage
   *
   * ```javascript
   * item.getSourceId().then(function(id) {
   *   // The rest of your code here
   * });
   * ```
   */
  getSourceId: () => Promise<string>
}

applyMixins(Source, [iSource])
