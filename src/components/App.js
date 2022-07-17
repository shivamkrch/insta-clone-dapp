import React, { Component } from "react";
import Web3 from "web3";
import "./App.css";
import InstaClone from "../abis/InstaClone.json";
import Navbar from "./Navbar";
import Main from "./Main";
import ipfsClient from "ipfs-http-client";

const ipfs = ipfsClient({
  host: "ipfs.infura.io",
  port: 5001,
  protocol: "https"
}); // leaving out the arguments will default to these values

class App extends Component {
  eventSubscription = null;

  constructor(props) {
    super(props);
    this.state = {
      account: "",
      instaClone: null,
      imageCount: 0,
      images: [],
      loading: true
    };
  }

  async componentDidMount() {
    await this.loadWeb3();
    await this.loadBlockchainData();
  }

  componentWillUnmount() {
    if (this.eventSubscription) {
      this.eventSubscription.unsubscribe();
    }
  }

  async loadWeb3() {
    if (window.ethereum) {
      window.web3 = new Web3(window.ethereum);
      await window.ethereum.enable();
    } else if (window.web3) {
      window.web3 = new Web3(window.web3.currentProvider);
    } else {
      alert("Metamask not found");
    }
  }

  loadBlockchainData = async () => {
    const { web3 } = window;
    const accounts = await web3.eth.getAccounts();
    this.setState({ account: accounts[0] });

    const networkId = await web3.eth.net.getId();
    const networkData = InstaClone.networks[networkId];
    if (networkData) {
      const instaClone = new web3.eth.Contract(
        InstaClone.abi,
        networkData.address
      );
      const imageCount = await instaClone.methods.imageCount().call();

      const images = [];
      for (let i = 1; i <= imageCount; i++) {
        const image = await instaClone.methods.getImage(i).call();
        images.push(image);
      }

      instaClone.events.NewImageCreated({}, this.onNewImageCreated);
      instaClone.events.ImageTipped({}, this.onImageTipped);

      this.setState({
        loading: false,
        images,
        imageCount,
        instaClone
      });
    } else {
      alert("InstaClone contract not deployed to detected network");
    }
  };

  onNewImageCreated = async (err, e) => {
    if (err) console.error(err);
    else {
      console.log(e.event, e.returnValues);
      const { images, instaClone } = this.state;
      const newImage = await instaClone.methods
        .getImage(e.returnValues.id)
        .call();
      this.setState({ images: [...images, newImage] });
    }
  };

  onImageTipped = (err, e) => {
    if (err) console.error(err);
    else {
      console.log(e.event, e.returnValues);
      const images = this.state.images.map((image) => {
        if (image.id === e.returnValues.id) {
          image.tipAmount = e.returnValues.tipAmount;
        }
        return image;
      });
      this.setState({ images });
    }
  };

  captureFile = (e) => {
    e.preventDefault();
    const file = e.target.files[0];
    const fileReader = new FileReader();
    fileReader.readAsArrayBuffer(file);

    fileReader.onloadend = () => {
      this.setState({ buffer: Buffer(fileReader.result) });
    };
  };

  uploadImage = (description) => {
    console.log("Submitting file to ipfs...");
    this.setState({ loading: true });

    //adding file to the IPFS
    ipfs.add(this.state.buffer, (error, result) => {
      console.log("Ipfs result", result);
      if (error) {
        console.error(error);
        return;
      }

      this.state.instaClone.methods
        .uploadImage(result[0].hash, description)
        .send({ from: this.state.account })
        .on("transactionHash", (hash) => {
          this.setState({ loading: false, buffer: null });
        });
    });
  };

  tipImageOwner = (id, tipAmount) => {
    this.setState({ loading: true });
    this.state.instaClone.methods
      .tipImageOwner(id)
      .send({ from: this.state.account, value: tipAmount })
      .on("transactionHash", (hash) => {
        this.setState({ loading: false });
      });
  };

  render() {
    return (
      <div>
        <Navbar account={this.state.account} />
        {this.state.loading ? (
          <div id="loader" className="text-center mt-5">
            <p>Loading...</p>
          </div>
        ) : (
          <Main
            captureFile={this.captureFile}
            uploadImage={this.uploadImage}
            tipImageOwner={this.tipImageOwner}
            images={this.state.images}
          />
        )}
      </div>
    );
  }
}

export default App;
