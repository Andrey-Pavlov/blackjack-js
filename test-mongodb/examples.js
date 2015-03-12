var MongoClient = require('mongodb').MongoClient
    , assert = require('assert');

// Connection URL
var url = 'mongodb://localhost:27017/myproject';

function Connect() {
// Use connect method to connect to the Server
    MongoClient.connect(url, function (err, db) {
        assert.equal(null, err);
        console.log("Connected correctly to server");

        db.close();
    });
}

function Insert(){
    var insertDocuments = function(db, callback) {
        // Get the documents collection
        var collection = db.collection('documents');
        // Insert some documents
        collection.insert([
            {a : 1}, {a : 2}, {a : 3}
        ], function(err, result) {
            assert.equal(err, null);
            assert.equal(3, result.length);
            console.log("Inserted 3 documents into the document collection");
            callback(result);
        });
    }

    MongoClient.connect(url, function(err, db) {
        assert.equal(null, err);
        console.log("Connected correctly to server");

        insertDocuments(db, function() {
            db.close();
        });
    });
}

function Update(){
    var insertDocuments = function(db, callback) {
        // Get the documents collection
        var collection = db.collection('documents');
        // Insert some documents
        collection.insert([
            {a : 1}, {a : 2}, {a : 3}
        ], function(err, result) {
            assert.equal(err, null);
            assert.equal(3, result.result.n);
            assert.equal(3, result.ops.length);
            console.log("Inserted 3 documents into the document collection");
            callback(result);
        });
    }

    var updateDocument = function(db, callback) {
        // Get the documents collection
        var collection = db.collection('documents');
        // Update document where a is 2, set b equal to 1
        collection.update({ a : 2 }
            , { $set: { b : 1 } }, function(err, result) {
                assert.equal(err, null);
                assert.equal(1, result.result.n);
                console.log("Updated the document with the field a equal to 2");
                callback(result);
            });
    }

    MongoClient.connect(url, function(err, db) {
        assert.equal(null, err);
        console.log("Connected correctly to server");

        insertDocuments(db, function() {
            updateDocument(db, function() {
                db.close();
            });
        });
    });
}

function Remove(){
    var insertDocuments = function(db, callback) {
        // Get the documents collection
        var collection = db.collection('documents');
        // Insert some documents
        collection.insert([
            {a : 1}, {a : 2}, {a : 3}
        ], function(err, result) {
            assert.equal(err, null);
            assert.equal(3, result.result.n);
            assert.equal(3, result.ops.length);
            console.log("Inserted 3 documents into the document collection");
            callback(result);
        });
    };

    var updateDocument = function(db, callback) {
        // Get the documents collection
        var collection = db.collection('documents');
        // Update document where a is 2, set b equal to 1
        collection.update({ a : 2 }
            , { $set: { b : 1 } }, function(err, result) {
                assert.equal(err, null);
                assert.equal(1, result.result.n);
                console.log("Updated the document with the field a equal to 2");
                callback(result);
            });
    };

    var removeDocument = function(db, callback) {
        // Get the documents collection
        var collection = db.collection('documents');
        // Insert some documents
        collection.remove({ a : 3 }, function(err, result) {
            assert.equal(err, null);
            assert.equal(1, result.result.n);
            console.log("Removed the document with the field a equal to 3");
            callback(result);
        });
    };

    MongoClient.connect(url, function(err, db) {
        assert.equal(null, err);
        console.log("Connected correctly to server");

        insertDocuments(db, function() {
            updateDocument(db, function() {
                removeDocument(db, function() {
                    db.close();
                });
            });
        });
    });
}

function FindAllDocuments(){
    var insertDocuments = function(db, callback) {
        // Get the documents collection
        var collection = db.collection('documents');
        // Insert some documents
        collection.insert([
            {a : 1}, {a : 2}, {a : 3}
        ], function(err, result) {
            assert.equal(err, null);
            assert.equal(3, result.length);
            console.log("Inserted 3 documents into the document collection");
            callback(result);
        });
    };

    var updateDocument = function(db, callback) {
        // Get the documents collection
        var collection = db.collection('documents');
        // Update document where a is 2, set b equal to 1
        collection.update({ a : 2 }
            , { $set: { b : 1 } }, function(err, result) {
                assert.equal(err, null);
                assert.equal(1, result);
                console.log("Updated the document with the field a equal to 2");
                callback(result);
            });
    };

    var removeDocument = function(db, callback) {
        // Get the documents collection
        var collection = db.collection('documents');
        // Insert some documents
        collection.remove({ a : 3 }, function(err, result) {
            assert.equal(err, null);
            assert.equal(1, result);
            console.log("Removed the document with the field a equal to 3");
            callback(result);
        });
    };

    var removeDocument1 = function(db, callback) {
        // Get the documents collection
        var collection = db.collection('documents');
        // Insert some documents
        collection.remove({}, function(err, result) {
            assert.equal(err, null);
            assert.equal(2, result);
            console.log("Removed the document with the field a equal to 3");
            callback(result);
        });
    };

    var findDocuments = function(db, callback) {
        // Get the documents collection
        var collection = db.collection('documents');
        // Find some documents
        collection.find({}).toArray(function(err, docs) {
            assert.equal(err, null);
            assert.equal(2, docs.length);
            console.log("Found the following records");
            console.dir(docs)
            callback(docs);
        });
    };

    MongoClient.connect(url, function(err, db) {
        assert.equal(null, err);
        console.log("Connected correctly to server");

        insertDocuments(db, function() {
            updateDocument(db, function() {
                removeDocument(db, function() {
                    findDocuments(db, function() {
                        removeDocument1(db, function (){
                            db.close();
                        });
                });
                });
            });
        });
    });
}

//Connect();
//Insert();
//Update();
//Remove();
FindAllDocuments();



