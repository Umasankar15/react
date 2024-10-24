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
      roomId: string | null;
      opts: mixed | null;
      constructor(roomId) {
        this.roomId = roomId;
        Scheduler.log(`create(${this.roomId}, ${this.opts?.username})`);
      }
      update(opts) {
        this.opts = opts;
        Scheduler.log(`update(${this.roomId}, ${this.opts?.username})`);
      }
      disconnect() {
        Scheduler.log(`disconnect(${this.roomId}, ${this.opts?.username})`);
      }
    }
    function Test({roomId, username}) {
      const opts = useMemo(() => {
        return {username};
      }, [username]);
      useResourceEffect(
        () => {
          const connection = new ConnectionResource(roomId);
          connection.update(opts);
          return connection;
        },
        [roomId, opts],
        connection => {
          connection.update(opts);
          return connection;
        },
        [opts],
        connection => {
          connection.disconnect();
        },
      );
      return <div>Hello</div>;
    }

    await act(() => {
      root.render(<Test roomId={1} username="Jack" />);
    });
    assertLog(['create(1, undefined)', 'update(1, Jack)']);
    expect(root).toMatchRenderedOutput(<div>Hello</div>);

    await act(() => {
      root.render(<Test roomId={1} username="Lauren" />);
    });
    assertLog(['update(1, Lauren)']);

    await act(() => {
      root.render(<Test roomId={2} username="Lauren" />);
    });
    assertLog([
      'disconnect(1, Lauren)',
      'create(2, Lauren)',
      'update(2, Lauren)',
    ]);

    await act(() => {
      root.render(null);
    });
    assertLog(['disconnect(1, Lauren)']);
  });
});
