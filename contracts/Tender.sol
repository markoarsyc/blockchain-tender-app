// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.4;

/**
 * @title BuildingTender
 * @dev Sistem za prikupljanje ponuda za građevinske radove (obrnuta aukcija).
 * Pobeđuje majstor koji ponudi NAJNIŽU cenu.
 */
contract BuildingTender {
    // Adresa investitora zgrade koji postavlja tender
    address public manager;
    
    // Opis radova (npr. "Postavljanje parketa u hodniku")
    string public jobDescription;
    
    // Kontakt telefon ili email koji vidi samo pobednik
    string private secretContact;

    // Vreme završetka tendera
    uint public tenderEndTime;

    // Trenutno najniža ponuda i adresa tog majstora
    uint public lowestBid;
    address public lowestBidder;

    // Mapa za povraćaj depozita majstorima koji nisu prošli
    mapping(address => uint) pendingReturns;

    bool public ended;

    // Događaji koji će javljati React-u šta se dešava
    event LowestBidDecreased(address bidder, uint amount);
    event TenderEnded(address winner, uint amount);

    // Greške
    error TenderAlreadyEnded();
    error BidTooHigh(uint currentLowest);
    error TenderNotEnded();
    error TenderEndAlreadyCalled();
    error NotManager();

    /**
     * @param _biddingTime Koliko sekundi traje tender
     * @param _description Šta treba da se radi
     * @param _secret Kontakt podaci investitora
     * @param _initialPrice Početna maksimalna cena koju investitor želi da plati
     */
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
        lowestBid = _initialPrice; // Postavljamo plafon cene
    }

    /**
     * Majstori zovu ovu funkciju da pošalju ponudu.
     * @param proposedPrice Cena za koju bi radili posao (u Wei ili Eurima, zavisi od dogovora)
     */
    function applyForJob(uint proposedPrice) external payable {
        // 1. Provera da li je tender još uvek otvoren
        if (block.timestamp > tenderEndTime || ended) {
            revert TenderAlreadyEnded();
        }

        // 2. Provera da li je ponuda niža od trenutno najniže
        if (proposedPrice >= lowestBid) {
            revert BidTooHigh(lowestBid);
        }

        // 3. (Opciono) Sigurnosni depozit: Majstor mora da pošalje malo ETH-a kao garanciju
        // Ako je neko ranije bio najniži, vraćamo mu njegov depozit u "kasu" za podizanje
        if (lowestBidder != address(0)) {
            pendingReturns[lowestBidder] += msg.value;
        }

        // Ažuriramo ko vodi
        lowestBidder = msg.sender;
        lowestBid = proposedPrice;

        emit LowestBidDecreased(msg.sender, proposedPrice);
    }

    /**
     * Funkcija za podizanje depozita (za one koji nisu pobedili)
     */
    function withdrawDeposit() external returns (bool) {
        uint amount = pendingReturns[msg.sender];
        if (amount > 0) {
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
     * Završetak tendera (može da pozove bilo ko nakon isteka vremena)
     */
    function tenderEnd() external {
        if (msg.sender != manager) revert NotManager(); // <-- Restrikcija: samo vlasnik
        if (ended) revert TenderEndAlreadyCalled();

        ended = true;
        emit TenderEnded(lowestBidder, lowestBid);
    }

    /**
     * Samo pobednik može da vidi kontakt investitora
     */
    function getInvestorContact() external view returns (string memory) {
        require(ended, "Tender jos uvek traje.");
        require(msg.sender == lowestBidder, "Niste pobednik tendera.");
        return secretContact;
    }
}