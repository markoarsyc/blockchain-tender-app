// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.4;

/**
 * @title BuildingTender
 * @dev Decentralizovani sistem za sprovođenje obrnutih aukcija u građevinskom sektoru.
 * Povezuje investitore i izvođače radova, gde ugovor dodeljuje posao majstoru sa najnižom ponudom.
 */
contract BuildingTender {
    
    address public manager;
    string public jobDescription;
    string private secretContact;
    uint public tenderEndTime;
    
    uint public lowestBid;
    address public lowestBidder;

    // Fiksni sigurnosni depozit koji svaki majstor mora da priloži kao garanciju ozbiljnosti ponude
    uint public constant DEPOSIT_AMOUNT = 0.05 ether;

    // Struktura podataka za privremeno skladištenje sredstava majstora čije su ponude nadmašene
    mapping(address => uint) pendingReturns;

    bool public ended;

    // Eevents (Događaji) koje React aplikacija osluškuje u realnom vremenu
    event LowestBidDecreased(address indexed bidder, uint amount);
    event TenderEnded(address winner, uint amount);

    // Custom greške u cilju uštede Gas-a (Gas Optimization)
    error TenderAlreadyEnded();
    error BidTooHigh(uint currentLowest);
    error TenderNotEndedYet();
    error TenderEndAlreadyCalled();
    error NotManager();
    error IncorrectDepositValue();
    error NotTheWinner();

    constructor(
        uint _biddingTime,
        string memory _description,
        string memory _secret,
        uint _initialPrice
    ) {
        manager = msg.sender;
        jobDescription = _description;
        secretContact = _secret;
        tenderEndTime = block.timestamp + _biddingTime;
        lowestBid = _initialPrice; 
    }

    /**
     * @dev Funkcija preko koje izvođači (majstori) šalju svoje ponude.
     * Zahteva slanje tačnog iznosa garantnog depozita (DEPOSIT_AMOUNT).
     * @param proposedPrice Finansijska ponuda izvođača za izvršenje posla (izražena u Wei)
     */
    function applyForJob(uint proposedPrice) external payable {
        // 1. Validacija vremenskog okvira i trenutnog stanja aukcije
        if (block.timestamp > tenderEndTime || ended) {
            revert TenderAlreadyEnded();
        }

        // 2. Provera da li je poslata vrednost depozita ispravna
        if (msg.value != DEPOSIT_AMOUNT) {
            revert IncorrectDepositValue();
        }

        // 3. Validacija ekonomske isplativosti ponude (mora biti strogo niža od trenutne)
        if (proposedPrice >= lowestBid) {
            revert BidTooHigh(lowestBid);
        }

        // 4. Refundacija prethodnog vodećeg ponuđača
        // Ako već postoji majstor koji je vodio, njegov depozit se oslobađa i prebacuje u pendingReturns
        if (lowestBidder != address(0)) {
            pendingReturns[lowestBidder] += DEPOSIT_AMOUNT;
        }

        // Ažuriranje stanja na blockchain-u (State variables update)
        lowestBidder = msg.sender;
        lowestBid = proposedPrice;

        emit LowestBidDecreased(msg.sender, proposedPrice);
    }

    /**
     * @dev Pull-payment obrazac (pattern) koji omogućava majstorima koji nisu pobedili
     * da bezbedno povuku svoj garantni depozit, sprečavajući Reentrancy napade.
     */
    function withdrawDeposit() external returns (bool) {
        uint amount = pendingReturns[msg.sender];
        if (amount > 0) {
            // "Checks-Effects-Interactions" pattern: prvo resetujemo stanje, pa šaljemo novac
            pendingReturns[msg.sender] = 0;

            (bool success, ) = payable(msg.sender).call{value: amount}("");
            if (!success) {
                pendingReturns[msg.sender] = amount;
                return false;
            }
        }
        return true;
    }

    /**
     * @dev Funkcija za formalno zatvaranje tendera. 
     * Može je pozvati isključivo investitor nakon što istekne predviđeno vreme.
     */
    function tenderEnd() external {
        if (msg.sender != manager) revert NotManager();
        if (block.timestamp < tenderEndTime) revert TenderNotEndedYet();
        if (ended) revert TenderEndAlreadyCalled();

        ended = true;
        emit TenderEnded(lowestBidder, lowestBid);
    }

    /**
     * @dev Kriptografski zaštićen uvid u kontakt podatke investitora.
     * Pristup podacima je omogućen isključivo pobedniku aukcije nakon njenog zvaničnog završetka.
     */
    function getInvestorContact() external view returns (string memory) {
        if (!ended) revert TenderNotEndedYet();
        if (msg.sender != lowestBidder) revert NotTheWinner();
        
        return secretContact;
    }
}