pragma solidity ^0.5.0;

contract InstaClone {
    struct Image {
        uint id;
        string hash;
        string description;
        uint tipAmount;
        address payable author;
    }

    string public name = "InstaClone";
    uint public imageCount = 0;
    mapping(uint => Image) private images;

    event NewImageCreated(
        uint id,
        string hash,
        string description,
        uint tipAmount,
        address payable author
    );
    event ImageTipped(
        uint id,
        string hash,
        string description,
        uint tipAmount,
        address payable author
    );

    function getImage(uint imageId)
        public
        view
        returns (
            uint id,
            string memory hash,
            string memory description,
            uint tipAmount,
            address payable author
        )
    {
        Image memory image = images[imageId];
        return (
            image.id,
            image.hash,
            image.description,
            image.tipAmount,
            image.author
        );
    }

    function uploadImage(string memory _imgHash, string memory _description)
        public
    {
        require(bytes(_imgHash).length > 0);
        require(bytes(_description).length > 0);
        require(msg.sender != address(0x0));

        imageCount++;
        images[imageCount] = Image(
            imageCount,
            _imgHash,
            _description,
            0,
            msg.sender
        );
        emit NewImageCreated(imageCount, _imgHash, _description, 0, msg.sender);
    }

    function tipImageOwner(uint _id) public payable {
        require(_id > 0 && _id <= imageCount);
        Image memory _image = images[_id];
        address payable _author = _image.author;
        _author.transfer(msg.value);
        _image.tipAmount += msg.value;
        images[_id] = _image;
        emit ImageTipped(
            _image.id,
            _image.hash,
            _image.description,
            _image.tipAmount,
            _author
        );
    }
}
