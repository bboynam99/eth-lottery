contract('Lottery', function(accounts) {

    it("Should let you buy a ticket", function(done) {
        var getBalance = web3.eth.getBalance;
        var guess = 42;

        var my_init_balance = getBalance(accounts[0]).toNumber();

        Lottery.new(1, {from: accounts[3]}).then(function(l) {
            var contract_init_balance = getBalance(l.address).toNumber();
            l.bets_lengths.call(guess).then(function(init_num_bets) {
                l.ticket_price.call().then(function(ticket_price) {
                    l.make_bet.sendTransaction(guess, { from: accounts[0], value: ticket_price }).then(function() {
                        var contract_final_balance = getBalance(l.address).toNumber();
                        assert.equal(contract_final_balance - contract_init_balance, ticket_price,
                                     "Contract did not receive the correct bet money");

                        var my_final_balance = getBalance(accounts[0]).toNumber();
                        assert(my_init_balance - my_final_balance >= ticket_price,
                               "I somehow managed to pay less than the ticket price");

                        l.bets_lengths.call(guess).then(function(final_num_bets) {
                            assert.equal(final_num_bets - init_num_bets, 1,
                                         "Length of bets array did not increase");
                        });
                    });
                });
            });
        }).then(done).catch(done);
    });

    it("Should successfully perform draws", function(done) {
        var getBalance = web3.eth.getBalance;

        Lottery.new(1, {from: accounts[3]}).then(function(l) {
            var contract_init_balance = getBalance(l.address).toNumber();
            l.ticket_price.call().then(function(ticket_price) {
                for (var i = 0; i < 99; i++) {
                    l.make_bet.sendTransaction(i, {from: accounts[0], value: ticket_price});
                }
                // Only wait on the last transaction.
                l.make_bet.sendTransaction(100, {from: accounts[0], value: ticket_price}).then(function(_) {
                    var acc0_prb_balance = getBalance(accounts[0]).toNumber();
                    var contract_prb_balance = getBalance(l.address).toNumber();
                    var acc1_prb_balance = getBalance(accounts[1]).toNumber();
                    assert.equal(contract_prb_balance - contract_init_balance,
                                 ticket_price * 100,
                                 "Account 0 did not bet on every slot");
                    l.draw.sendTransaction({from: accounts[1]}).then(function(_) {
                        var acc0_pb_balance = getBalance(accounts[0]);
                        var acc1_pb_balance = getBalance(accounts[1]);

                        assert.equal(acc0_pb_balance - acc0_prb_balance,
                                     contract_prb_balance * 4 / 5,
                                     "Account 0 did not receive the right amount of prizes");
                        // Unfortunately we cannot calculate the exact amount
                        // paid to the drawer since the gas costs vary.
                        assert.isAbove(acc1_pb_balance - acc1_prb_balance,
                                     0,
                                     "Account 1 did not any incentive");
                    });
                });
            });
        }).then(done).catch(done);
    });

    it("Should test the events", function(done) {

        Lottery.new(1, {from: accounts[3]}).then(function(l) {
            l.ticket_price.call().then(function(ticket_price) {
                l.make_bet.sendTransaction(42, {from: accounts[0], value: ticket_price}).then(function(_) {
                    l.draw.sendTransaction({from: accounts[1]}).then(function(_) {
                        l.Drawn().get(function(err, events) {
                            assert.equal(events.length, 1, "Got more events than expected");
                            assert.equal(events[0].args._drawer.valueOf(), accounts[1],
                                         "Unknown drawer");
                            assert.isAtLeast(events[0].args.winning_number.valueOf(),
                                             0, "Invalid winning number < 0");
                            assert.isAtMost(events[0].args.winning_number.valueOf(),
                                            100, "Invalid winning number > 100");
                        });
                    });
                });
            });
        }).then(done).catch(done);
    });

});