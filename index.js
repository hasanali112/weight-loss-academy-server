const express = require("express");
const app = express();
const cors = require("cors");
const jwt = require("jsonwebtoken");
require("dotenv").config();
const stripe = require("stripe")(process.env.PAYMENT_SECRET_KEY);
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const port = process.env.PORT || 5000;

// middleware
app.use(cors());
app.use(express.json());

const verifyJWT = (req, res, next) => {
  const authorization = req.headers.authorization;
  if (!authorization) {
    return res
      .status(401)
      .send({ error: true, message: "unauthorized access" });
  }
  // bearer token
  const token = authorization.split(" ")[1];

  jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
    if (err) {
      return res
        .status(401)
        .send({ error: true, message: "unauthorized access" });
    }
    req.decoded = decoded;
    next();
  });
};

const uri = `mongodb+srv://${process.env.DB_username}:${process.env.DB_password}@cluster1.4gey7ap.mongodb.net/?retryWrites=true&w=majority`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    client.connect();

    const userCollection = client.db("weight-loss-academy").collection("users");
    const classCollection = client
      .db("weight-loss-academy")
      .collection("classes");
    const selectedClassCollection = client
      .db("weight-loss-academy")
      .collection("selected-class");
    const paymentClassCollection = client
      .db("weight-loss-academy")
      .collection("payment");
    const popularClassCollection = client
      .db("weight-loss-academy")
      .collection("popular-class");

    //JWT
    app.post("/jwt", (req, res) => {
      const user = req.body;
      const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, {
        expiresIn: "1h",
      });

      res.send({ token });
    });

    const verifyAdmin = async (req, res, next) => {
      const email = req.decoded.email;
      const query = { email: email }
      const user = await userCollection.findOne(query);
      if (user?.role !== 'admin') {
        return res.status(403).send({ error: true, message: 'forbidden message' });
      }
      next();
    }
    app.get("/users", verifyJWT, verifyAdmin, async (req, res) => {
      const result = await userCollection.find().toArray();
      res.send(result);
    });

    //all approve class for classes page
    app.get("/ourclasses", async (req, res) => {
      const result = await classCollection
        .find({ status: "approve" })
        .toArray();
      res.send(result);
    });

    app.get('/popular-classes', async(req, res)=>{
      const result = await popularClassCollection.find().toArray()
      res.send(result)
    })



    app.get("/ourinstructor", async (req, res) => {
      const result = await userCollection
        .find({ role: "instructor" })
        .toArray();
      res.send(result);
    });

    //popular instrutor
    app.get("/popularinstructor", async (req, res) => {
      const result = await userCollection
        .find({ role: "instructor" })
        .limit(6)
        .toArray();
      res.send(result);
    });

    //student dashborad
    app.get("/myclasses/:email", async (req, res) => {
      const result = await selectedClassCollection.find({ email: req.params.email }).toArray();
      res.send(result);
    });

    app.post("/myselectedclass", async (req, res) => {
      const selectedClass = req.body;
      const query = { classItemId: selectedClass.classItemId };
      const exsisId = await selectedClassCollection.findOne(query);
      if (exsisId) {
        return res.send({ message: "already exsist" });
      }
      const result = await selectedClassCollection.insertOne(selectedClass);
      res.send(result);
    });

    app.delete("/selected-class/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await selectedClassCollection.deleteOne(query);
      res.send(result);
    });

    //all user and social sign in
    app.post("/users", async (req, res) => {
      const user = req.body;
      const query = { email: user.email };
      const exsisUser = await userCollection.findOne(query);
      if (exsisUser) {
        return res.send({ message: "already exsist" });
      }
      const result = await userCollection.insertOne(user);
      res.send(result);
    });

    //check admin/instrutor/student
    app.get('/users/admin/:email', verifyJWT, async (req, res) => {
      const email = req.params.email;

      if (req.decoded.email !== email) {
        res.send({ admin: false })
      }

      const query = { email: email }
      const user = await userCollection.findOne(query);
      const result = { admin: user?.role === 'admin' }
      res.send(result);
    })


    app.get('/users/instructor/:email', verifyJWT, async (req, res) => {
      const email = req.params.email;

      if (req.decoded.email !== email) {
        res.send({ instructor: false })
      }

      const query = { email: email }
      const user = await userCollection.findOne(query);
      const result = { instructor: user?.role === 'instructor' }
      res.send(result);
    })


    
    
    //get admin role
    app.patch("/users/admin/:id", async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      const updateDoc = {
        $set: {
          role: "admin",
        },
      };
      const result = await userCollection.updateOne(filter, updateDoc);
      res.send(result);
    });

    //get instructor
    app.patch("/users/instructor/:id", async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      const updateDoc = {
        $set: {
          role: "instructor",
        },
      };
      const result = await userCollection.updateOne(filter, updateDoc);
      res.send(result);
    });

    //get class
    app.get("/allclasses", async (req, res) => {
      const result = await classCollection.find().toArray();
      res.send(result);
    });

    //add a class
    app.post("/classes", async (req, res) => {
      const addClass = req.body;
      const result = await classCollection.insertOne(addClass);
      res.send(result);
    });

    //admin approve class

    app.patch("/class/approve/:id", async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      const updateDoc = {
        $set: {
          status: "approve",
        },
      };
      const result = await classCollection.updateOne(filter, updateDoc);
      res.send(result);
    });

    //admin denies class
    app.patch("/class/deny/:id", async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      const updateDoc = {
        $set: {
          status: "deny",
        },
      };
      const result = await classCollection.updateOne(filter, updateDoc);
      res.send(result);
    });

    //feedback
    app.patch("/feedback/:id", async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      const options = { upsert: true };
      const feedbackUpdate = req.body;
      const update = {
        $set: {
          feedback: feedbackUpdate.feedback,
        },
      };
      const result = await classCollection.updateOne(filter, update, options);
      res.send(result);
    });

    //create payment
    app.post("/create-payment-intent", verifyJWT, async (req, res) => {
      const { price } = req.body;
      const amount = price * 100;
      const paymentIntent = await stripe.paymentIntents.create({
        amount: amount,
        currency: "usd",
        payment_method_types: ["card"],
      });
      res.send({
        clientSecret: paymentIntent.client_secret,
      });
    });

    //get enroll item
    app.get("/entrolledclasses", async (req, res) => {
      const result = await paymentClassCollection.find().toArray();
      res.send(result);
    });

    //enroll history
    app.get("/enrollhistory", async (req, res) => {
      const query = {}
      const options = {
        sort: { date: -1 },
      };
      const result = await paymentClassCollection.find(query, options).toArray();
      res.send(result);
    });

    //enroll the class
    app.post("/payment", verifyJWT, async (req, res) => {
      const payment = req.body;
      const insertedResult = await paymentClassCollection.insertOne(payment);
      const query = { _id: new ObjectId(payment.enrollItemId) };
      const deletedResult = await selectedClassCollection.deleteOne(query);
      res.send({ insertedResult, deletedResult });
    });




    app.get('/payment/count', async (req, res) => {
        const result = await paymentClassCollection.aggregate([
          {
            $lookup: {
              from: 'classes',
              localField: 'enrollClassId',
              foreignField: '_id',
              as: 'classInfo'
            }
          },
          {
            $group: {
              _id: null,
              count: { $sum: 1 }
            }
          }
        ]).toArray();
        const count = result.length > 0 ? result[0].count : 0;
        const response = [{ id: 1, count }]; // Assuming the id value is 1
        res.send(JSON.stringify(response));
      
    });




    // Send a ping to confirm a successful connection
    // await client.db("admin").command({ ping: 1 });
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!"
    );
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);

app.get("/", (req, res) => {
  res.send("Weight Loss Academy is running");
});

app.listen(port, () => {
  console.log(`Weight Loss Academy is running ${port}`);
});
