/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @emails react-core
 * @jest-environment node
 */

'use strict';

let React;
let ReactNoop;
let Scheduler;
let act;
let useResourceEffect;
let useMemo;
let assertLog;

describe('ReactResourceEffect', () => {
  beforeEach(() => {
    jest.resetModules();
    jest.useFakeTimers();

    React = require('react');
    ReactNoop = require('react-noop-renderer');
    Scheduler = require('scheduler');
    act = require('internal-test-utils').act;
    useResourceEffect = React.useResourceEffect;
    useMemo = React.useMemo;

    const InternalTestUtils = require('internal-test-utils');
    assertLog = InternalTestUtils.assertLog;
  });

  it('does the basics', async () => {
    const root = ReactNoop.createRoot();
    class ConnectionResource {
      roomId: string;
      opts: mixed;
      constructor(roomId, opts) {
        this.roomId = roomId;
        this.opts = opts;
        this.connect();
      }
      update(roomId, opts) {
        this.disconnect();
        this.roomId = roomId;
        this.opts = opts;
        this.connect();
      }
      connect() {
        Scheduler.log(
          `Connection:connect(${this.roomId}, ${this.opts.username})`,
        );
      }
      disconnect() {
        Scheduler.log(
          `Connection:disconnect(${this.roomId}, ${this.opts.username})`,
        );
      }
    }

    function Parent({roomId, username}) {
      const opts = useMemo(() => {
        return {username};
      }, [username]);
      useResourceEffect(
        () => new ConnectionResource(roomId, opts), // create
        [roomId, opts], // create deps
        connection => {
          connection.update(roomId, opts);
        }, // update
        [roomId, opts], // update deps
        connection => {
          connection.disconnect();
        }, // destroy
      );
      return <div>Hello</div>;
    }

    await act(() => {
      root.render(<Parent roomId={1} username="Jack" />);
    });
    assertLog([]);
    expect(root).toMatchRenderedOutput(<div>Hello</div>);
    assertLog(['Connection:connect(1, Jack)']);
    await act(() => {
      root.render(<Parent roomId={1} username="Lauren" />);
    });
    assertLog([
      'Connection:disconnect(1, Jack)',
      'Connection:connect(1, Lauren)',
    ]);
    await act(() => {
      root.render(null);
    });
    assertLog(['Connection:disconnect(1, Lauren)']);
  });
});
