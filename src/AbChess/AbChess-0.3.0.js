/**
 * AbChess.js
 * 2017-11-12
 * Copyright (c) 2017 Nimzozo
 */

/*global
    window
*/

/*jslint
    browser, white
*/

/**
 * TODO
 * - Move class ?
 * - FEN, PGN validation
 * - Game class :
 *  - Export (modify data, convert, write PGN)
 *  - Import (read PGN, analyse, display / navigate)
 * - custom events
 * - look for duplications
 */

/**
 * Abchess
 */
window.AbChess = window.AbChess || function (abId, abOptions) {
    "use strict";

    /**
     * The board used for the API.
     */
    var abBoard = {};

    /**
     * Chess constants.
     */
    var chess = {
        bishop: "b",
        bishopVectors: [[-1, -1], [-1, 1], [1, -1], [1, 1]],
        black: "b",
        castleKing: "O-O",
        castleQueen: "O-O-O",
        columns: "abcdefgh",
        defaultFEN: "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1",
        emptyFEN: "8/8/8/8/8/8/8/8 w - - 0 1",
        htmlBlackBishop: "&#9821;",
        htmlBlackKing: "&#9818;",
        htmlBlackKnight: "&#9822;",
        htmlBlackPawn: "&#9823;",
        htmlBlackQueen: "&#9819;",
        htmlBlackRook: "&#9820;",
        htmlWhiteBishop: "&#9815;",
        htmlWhiteKing: "&#9812;",
        htmlWhiteKnight: "&#9816;",
        htmlWhitePawn: "&#9817;",
        htmlWhiteQueen: "&#9813;",
        htmlWhiteRook: "&#9814;",
        king: "k",
        knight: "n",
        pawn: "p",
        queen: "q",
        rook: "r",
        rookVectors: [[-1, 0], [0, -1], [0, 1], [1, 0]],
        rows: "12345678",
        white: "w"
    };

    /**
     * Css classes / ids.
     */
    var css = {
        blackSquare: "square_black",
        checkSquare: "square_check",
        columnsBorder: "columns-border",
        columnsBorderFragment: "columns-border__fragment",
        lastMoveSquare: "square_last-move",
        overflownSquare: "square_overflown",
        pieceGhost: "piece-ghost",
        promotionButton: "promotion-button",
        promotionDiv: "promotion-div",
        rowsBorder: "rows-border",
        rowsBorderFragment: "rows-border__fragment",
        squareCanvas: "square__canvas",
        squarePiece: "square__piece",
        squares: "squares",
        startSquare: "square_selected",
        whiteSquare: "square_white"
    };

    /**
     * Options default values.
     */
    var defaultOptions = {
        animationSpeed: 10,
        clickable: true,
        draggable: true,
        flipped: false,
        imagesExtension: ".png",
        imagesPath: "images/wikipedia/",
        legalMarksColor: "cornflowerblue",
        markKingInCheck: true,
        markLastMove: true,
        markLegalSquares: true,
        markOverflownSquare: true,
        markStartSquare: true,
        notationBorder: true,
        width: 400
    };

    /**
     * Custom events.
     */
    var events = {
        onMovePlayed: null,
        onPositionChanged: null
    };

    /**
     * Raf
     */
    var raf = window.requestAnimationFrame;

    /**
     * Regular expressions.
     */
    var regExp = {
        castleEnd: /[cg][18]/,
        castleStart: /e[18]/,
        comment: /\{[^]+?\}/gm,
        fen: /^(?:[bBkKnNpPqQrR1-8]{1,8}\/){7}[bBkKnNpPqQrR1-8]{1,8}\s(b|w)\s(K?Q?k?q?|-)\s([a-h][36]|-)\s(0|[1-9]\d{0,2})\s([1-9]\d{0,2})$/,
        pgnCastle: /^O-O(?:-O)?(?:\+|#)?$/,
        pgnKing: /^(?:Kx?([a-h][1-8])|O-O(?:-O)?)(?:\+|#)?$/,
        pgnMove: /(?:[1-9]\d{0,2}\.(?:\.\.)?\s?)?(?:O-O(?:-O)?|(?:[BNQR][a-h]?[1-8]?|K)x?[a-h][1-8]|(?:[a-h]x)?[a-h][1-8](?:=[BNQR])?)(?:\+|#)?/gm,
        pgnMoveNumber: /[1-9]\d{0,2}\.(?:\.\.)?\s?/,
        pgnPawn: /^([a-h]?)x?([a-h][1-8])(=[BNQR])?(?:\+|#)?$/,
        pgnPiece: /^[BNQR]([a-h]?[1-8]?)x?([a-h][1-8])(?:\+|#)?$/,
        pgnPromotion: /\=[BNQR]/,
        promotionEnd: /[a-h][18]/,
        tagPair: /\[[A-Z][^]+?\s"[^]+?"\]/gm,
        tagPairCapture: /\[(\S+)\s"(.*)"\]/,
        variation: /\([^()]*?\)/gm
    };

    /**
     * Convert a FEN string to a position object.
     * @param {string} fen The FEN string to convert.
     */
    function fenToObject(fen) {
        var position = {};
        var rows = [];
        var str = fen.replace(/\s.*/, "");
        rows = str.split("/");
        rows.forEach(function (row, rowIndex) {
            var chars = row.split("");
            var columnIndex = 0;
            chars.forEach(function (char) {
                var square = "";
                if (/\d/.test(char)) {
                    columnIndex += Number(char);
                } else {
                    square = chess.columns[columnIndex] +
                        chess.rows[7 - rowIndex];
                    position[square] = char;
                    columnIndex += 1;
                }
            });
        });
        return position;
    }

    /**
     * Return the coordinates of an element.
     * @param {HTMLElement} element The concerned HTML element.
     */
    function getCoordinates(element) {
        var x = element.getBoundingClientRect().left + window.pageXOffset;
        var y = element.getBoundingClientRect().top + window.pageYOffset;
        return [x, y];
    }

    // function isValidFEN() { }
    // function isValidPGN() { }

    /**
     * Convert a position to a FEN string.
     * @param {object} object The object to convert.
     */
    function objectToFEN(object) {
        var columns = chess.columns.split("");
        var fen = "";
        var rows = chess.rows.split("").reverse();
        rows.forEach(function (row, rowIndex) {
            var emptyCount = 0;
            columns.forEach(function (column, columnIndex) {
                var square = column + row;
                if (object.hasOwnProperty(square)) {
                    if (emptyCount > 0) {
                        fen += emptyCount;
                        emptyCount = 0;
                    }
                    fen += object[square];
                } else {
                    emptyCount += 1;
                    if (columnIndex > 6) {
                        fen += emptyCount;
                    }
                }
            });
            if (rowIndex < 7) {
                fen += "/";
            }
        });
        return fen;
    }

    /**
     * The class to create a chess position.
     * @param {string} fen The FEN string representing the position.
     */
    function Position(fen) {
        var position = {
            activeColor: "",
            allowedCastles: "",
            enPassant: "",
            fen: fen,
            fullMoveNumber: 0,
            halfMoveClock: 0,
            squares: {}
        };

        /**
         * Initialize and return the position.
         */
        position.create = function () {
            var result = regExp.fen.exec(fen);
            position.activeColor = result[1];
            position.allowedCastles = result[2];
            position.enPassant = result[3];
            position.halfMoveClock = result[4];
            position.fullMoveNumber = result[5];
            position.squares = fenToObject(fen);
            return position;
        };

        /**
         * Return the possible attacking moves.
         */
        position.getAttackingPawnMoves = function (start, allowEmpty) {
            var direction = 0;
            var moves = [];
            var pawnChar = position.squares[start];
            var pawnColor = "";
            var rowIndex = 0;
            var square = "";
            var startColumn = chess.columns.indexOf(start.charAt(0));
            var startRow = chess.rows.indexOf(start.charAt(1));
            var vectors = [-1, 1];
            pawnColor = (pawnChar.toUpperCase() === pawnChar)
                ? chess.white
                : chess.black;
            direction = (pawnColor === chess.white)
                ? 1
                : -1;
            rowIndex = startRow + direction;
            if (rowIndex < 0 || rowIndex > 7) {
                return [];
            }
            vectors.forEach(function (vector) {
                var columnIndex = startColumn + vector;
                var pieceChar = "";
                var pieceColor = "";
                if (columnIndex < 0 || columnIndex > 7) {
                    return;
                }
                square = chess.columns[columnIndex] + chess.rows[rowIndex];
                if (position.squares.hasOwnProperty(square)) {
                    pieceChar = position.squares[square];
                    pieceColor = (pieceChar.toLowerCase() === pieceChar)
                        ? chess.black
                        : chess.white;
                    if (pieceColor !== pawnColor) {
                        moves.push(square);
                    }
                } else if (position.enPassant === square || allowEmpty) {
                    moves.push(square);
                }
            });
            return moves;
        };

        /**
         * Return the moves for bishop, queen, rook.
         */
        position.getBQRMoves = function (start, vectors) {
            var moves = [];
            var startColumn = chess.columns.indexOf(start.charAt(0));
            var startRow = chess.rows.indexOf(start.charAt(1));
            vectors.forEach(function (vector) {
                var columnIndex = startColumn + vector[0];
                var rowIndex = startRow + vector[1];
                var pieceChar = "";
                var pieceColor = "";
                var square = "";
                while (columnIndex >= 0 && columnIndex < 8 &&
                    rowIndex >= 0 && rowIndex < 8) {
                    square = chess.columns[columnIndex] + chess.rows[rowIndex];
                    if (position.squares.hasOwnProperty(square)) {
                        pieceChar = position.squares[square];
                        pieceColor = (pieceChar.toLowerCase() === pieceChar)
                            ? chess.black
                            : chess.white;
                        if (pieceColor !== position.activeColor) {
                            moves.push(square);
                        }
                        return;
                    }
                    moves.push(square);
                    columnIndex += vector[0];
                    rowIndex += vector[1];
                }
            });
            return moves;
        };

        /**
         * Return the possible castling moves.
         */
        position.getCastles = function (start) {
            var allowedCastles = position.allowedCastles;
            var castles = [chess.queen, chess.king];
            var checks = [["d", "c"], ["f", "g"]];
            var collisions = [["d", "c", "b"], ["f", "g"]];
            var color = position.activeColor;
            var ennemyColor = "";
            var moves = [];
            if (start.charAt(0) !== chess.columns.charAt(4) ||
                allowedCastles === "-") {
                return [];
            }
            if ((color === chess.white &&
                start.charAt(1) !== chess.rows.charAt(0)) ||
                (color === chess.black &&
                    start.charAt(1) !== chess.rows.charAt(7))) {
                return [];
            }
            ennemyColor = (color === chess.white)
                ? chess.black
                : chess.white;
            if (position.isAttacked(start, ennemyColor)) {
                return [];
            }
            castles.forEach(function (castle, i) {
                var hasCheck = false;
                var hasCollision = false;
                if (color === chess.white) {
                    castle = castle.toUpperCase();
                }
                if (allowedCastles.indexOf(castle) === -1) {
                    return;
                }
                hasCollision = collisions[i].some(function (collision) {
                    return position.squares.hasOwnProperty(collision +
                        start.charAt(1));
                });
                if (hasCollision) {
                    return;
                }
                hasCheck = checks[i].some(function (check) {
                    return position.isAttacked(check + start.charAt(1),
                        ennemyColor);
                });
                if (!hasCheck) {
                    moves.push(checks[i][1] + start.charAt(1));
                }
            });
            return moves;
        };

        /**
         * Return the current FEN string.
         */
        position.getFEN = function () {
            position.fen = objectToFEN(position.squares);
            position.fen += " " + position.activeColor + " " +
                position.allowedCastles + " " + position.enPassant + " " +
                position.halfMoveClock + " " + position.fullMoveNumber;
            return position.fen;
        };

        /**
         * Return the desired king position.
         */
        position.getKing = function (color) {
            var king = chess.king;
            var square = "";
            if (color === chess.white) {
                king = king.toUpperCase();
            }
            Object.keys(position.squares).some(function (key) {
                if (position.squares[key] === king) {
                    square = key;
                    return true;
                }
                return false;
            });
            return square;
        };

        /**
         * Return the possible moves in a position.
         */
        position.getKingMoves = function (start) {
            var castles = position.getCastles(start);
            var ennemy = "";
            var ennemyMoves = [];
            var moves = [];
            var vectors = [
                [-1, -1], [-1, 0], [-1, 1],
                [0, -1], [0, 1],
                [1, -1], [1, 0], [1, 1]
            ];
            moves = position.getKNMoves(start, vectors);
            moves = castles.concat(moves);
            ennemy = (position.activeColor === chess.white)
                ? position.getKing(chess.black)
                : position.getKing(chess.white);
            ennemyMoves = position.getKNMoves(ennemy, vectors);
            moves = moves.filter(function (move) {
                return ennemyMoves.indexOf(move) === -1;
            });
            return moves;
        };

        /**
         * Return the moves for king, knight.
         */
        position.getKNMoves = function (start, vectors) {
            var moves = [];
            var startColumn = chess.columns.indexOf(start.charAt(0));
            var startRow = chess.rows.indexOf(start.charAt(1));
            vectors.forEach(function (vector) {
                var columnIndex = startColumn + vector[0];
                var rowIndex = startRow + vector[1];
                var pieceChar = "";
                var pieceColor = "";
                var square = "";
                if (columnIndex < 0 || columnIndex > 7 ||
                    rowIndex < 0 || rowIndex > 7) {
                    return;
                }
                square = chess.columns[columnIndex] + chess.rows[rowIndex];
                if (position.squares.hasOwnProperty(square)) {
                    pieceChar = position.squares[square];
                    pieceColor = (pieceChar.toLowerCase() === pieceChar)
                        ? chess.black
                        : chess.white;
                    if (pieceColor === position.activeColor) {
                        return;
                    }
                }
                moves.push(square);
            });
            return moves;
        };

        /**
         * Return the legal moves of the piece in a position.
         */
        position.getLegalMoves = function (start) {
            var ennemyColor = "";
            var moves = [];
            var pieceChar = position.squares[start];
            var pieceColor = "";
            pieceColor = (pieceChar === pieceChar.toUpperCase())
                ? chess.white
                : chess.black;
            if (position.activeColor !== pieceColor) {
                return [];
            }
            ennemyColor = (pieceColor === chess.white)
                ? chess.black
                : chess.white;
            moves = position.getMoves(start);
            return moves.filter(function (moveEnd) {
                var king = "";
                var testPosition = position.getNext(start, moveEnd);
                king = testPosition.getKing(pieceColor);
                return !testPosition.isAttacked(king, ennemyColor);
            });
        };

        position.getMoves = function (start, allowEmpty) {
            var pieceName = position.squares[start].toLowerCase();
            var vectors = [];
            if (pieceName === chess.bishop) {
                return position.getBQRMoves(start, chess.bishopVectors);
            }
            if (pieceName === chess.king) {
                return position.getKingMoves(start);
            }
            if (pieceName === chess.knight) {
                vectors = [
                    [-2, -1], [-2, 1], [-1, -2], [-1, 2],
                    [1, -2], [1, 2], [2, -1], [2, 1]
                ];
                return position.getKNMoves(start, vectors);
            }
            if (pieceName === chess.queen) {
                vectors = chess.bishopVectors.concat(chess.rookVectors);
                return position.getBQRMoves(start, vectors);
            }
            if (pieceName === chess.rook) {
                return position.getBQRMoves(start, chess.rookVectors);
            }
            if (pieceName === chess.pawn) {
                return position.getPawnMoves(start, allowEmpty);
            }
        };

        /**
         * Return a new position after a move has been played.
         */
        position.getNext = function (start, end, promotion) {
            var next = new Position(position.getFEN());
            promotion = promotion || chess.queen;
            next.update(start, end, promotion);
            return next;
        };

        /**
         * Return the possible moves in a position.
         */
        position.getPawnMoves = function (start, allowEmpty) {
            var direction = 0;
            var moves = position.getAttackingPawnMoves(start, allowEmpty);
            var rowIndex = 0;
            var square = "";
            var startColumn = chess.columns.indexOf(start.charAt(0));
            var startRow = chess.rows.indexOf(start.charAt(1));
            direction = (position.activeColor === chess.white)
                ? 1
                : -1;
            rowIndex = startRow + direction;
            if (rowIndex < 0 || rowIndex > 7) {
                return [];
            }
            square = chess.columns[startColumn] + chess.rows[rowIndex];
            if (!position.squares.hasOwnProperty(square)) {
                moves.push(square);
                if ((startRow === 1 && position.activeColor === chess.white) ||
                    (startRow === 6 && position.activeColor === chess.black)) {
                    square = chess.columns[startColumn] +
                        chess.rows[rowIndex + direction];
                    if (!position.squares.hasOwnProperty(square)) {
                        moves.push(square);
                    }
                }
            }
            return moves;
        };

        /**
         * Return an array of pieces places.
         */
        position.getPieces = function (color) {
            return Object.keys(position.squares).filter(function (key) {
                var char = position.squares[key];
                return (color === chess.white && char === char.toUpperCase()) ||
                    (color === chess.black && char === char.toLowerCase());
            });
        };

        position.getSimpleKingMove = function (pgnMove) {

            // Return a simple move from a PGN king move.

            var matches = [];
            var move = {};
            var row = "";
            if (regExp.pgnCastle.test(pgnMove)) {
                row = (position.activeColor === chess.white)
                    ? chess.rows.charAt(0)
                    : chess.rows.charAt(7);
                move.start = chess.columns.charAt(4) + row;
                move.arrival = (pgnMove === chess.castleKing)
                    ? chess.columns.charAt(6) + row
                    : chess.columns.charAt(2) + row;
            } else {
                matches = pgnMove.match(regExp.pgnKing);
                move.arrival = matches[1];
                move.start = position.getKing(position.activeColor);
            }
            return move;
        };

        position.getSimpleMove = function (pgnMove) {

            // Return the corresponding move in simple notation.

            if (regExp.pgnKing.test(pgnMove)) {
                return position.getSimpleKingMove(pgnMove);
            }
            if (regExp.pgnPawn.test(pgnMove)) {
                return position.getSimplePawnMove(pgnMove);
            }
            if (regExp.pgnPiece.test(pgnMove)) {
                return position.getSimplePieceMove(pgnMove);
            }
        };

        position.getSimplePawnMove = function (pgnMove) {

            // Return a simple move from a PGN pawn move.

            var matches = [];
            var move = {};
            matches = pgnMove.match(regExp.pgnPawn);
            move.ambiguity = matches[1];
            move.arrival = matches[2];
            if (regExp.pgnPromotion.test(pgnMove)) {
                move.promotion = matches[3].charAt(1);
            }
            move.piece = chess.pawn;
            move.start = position.getSimpleStart(move);
            return move;
        };

        position.getSimplePieceMove = function (pgnMove) {

            // Return a simple move from a PGN piece move.

            var matches = [];
            var move = {};
            matches = pgnMove.match(regExp.pgnPiece);
            move.ambiguity = matches[1];
            move.arrival = matches[2];
            move.piece = pgnMove.charAt(0);
            move.start = position.getSimpleStart(move);
            return move;
        };

        position.getSimpleStart = function (move) {

            // Return the start of a piece move.

            var piecesPlaces = [];
            var start = "";
            piecesPlaces = position.getPieces(position.activeColor);
            piecesPlaces.some(function (place) {
                var legalSquares = [];
                var testPiece = position.squares[place];
                if (testPiece.toLowerCase() !== move.piece.toLowerCase()) {
                    return false;
                }
                legalSquares = position.getLegalMoves(place);
                if (legalSquares.indexOf(move.arrival) === -1) {
                    return false;
                }
                if (move.ambiguity === "" ||
                    place.indexOf(move.ambiguity) > -1) {
                    start = place;
                    return true;
                }
                return false;
            });
            return start;
        };

        /**
         * Check if a square is attacked in the position.
         */
        position.isAttacked = function (square, ennemyColor) {
            var ennemies = [];
            ennemies = position.getPieces(ennemyColor);
            ennemies = ennemies.filter(function (ennemy) {
                return position.squares[ennemy].toLowerCase() !== chess.king;
            });
            return ennemies.some(function (ennemy) {
                var moves = [];
                moves = position.getMoves(ennemy, true);
                return moves.indexOf(square) > -1;
            });
        };

        /**
         * Update the position after a played move.
         */
        position.update = function (start, end, promotion) {
            var activeColor = "";
            var capture = "";
            var endRowIndex = 0;
            var enPassant = "-";
            var enPassantRow = "";
            var fullMoveNumber = Number(position.fullMoveNumber);
            var halfMoveClock = 0;
            var piece = position.squares[start];
            var rookEnd = "";
            var rookStart = "";
            var startRowIndex = 0;
            if (position.activeColor === chess.white) {
                activeColor = chess.black;
            } else {
                activeColor = chess.white;
                fullMoveNumber += 1;
            }
            if (piece.toLowerCase() === chess.pawn) {
                startRowIndex = chess.rows.indexOf(start.charAt(1));
                endRowIndex = chess.rows.indexOf(end.charAt(1));
                if (endRowIndex === 0 || endRowIndex === 7) {
                    piece = (position.activeColor === chess.white)
                        ? promotion.toUpperCase()
                        : promotion.toLowerCase();
                } else if (end === position.enPassant) {
                    capture = (position.activeColor === chess.white)
                        ? position.enPassant.charAt(0) + chess.rows.charAt(4)
                        : position.enPassant.charAt(0) + chess.rows.charAt(3);
                    delete position.squares[capture];
                } else if (Math.abs(endRowIndex - startRowIndex) === 2) {
                    enPassantRow = (position.activeColor === chess.white)
                        ? chess.rows.charAt(2)
                        : chess.rows.charAt(5);
                    enPassant = start.charAt(0) + enPassantRow;
                }
            } else {
                if (piece.toLowerCase() === chess.king) {
                    if (regExp.castleStart.test(start) &&
                        regExp.castleEnd.test(end)) {
                        if (end.charAt(0) === chess.columns.charAt(2)) {
                            rookStart = chess.columns.charAt(0);
                            rookEnd = chess.columns.charAt(3);
                        } else {
                            rookStart = chess.columns.charAt(7);
                            rookEnd = chess.columns.charAt(5);
                        }
                        rookStart += end.charAt(1);
                        rookEnd += end.charAt(1);
                        position.squares[rookEnd] = position.squares[rookStart];
                        delete position.squares[rookStart];
                    }
                }
                if (!position.squares.hasOwnProperty(end)) {
                    halfMoveClock = Number(position.halfMoveClock) + 1;
                }
            }
            position.activeColor = activeColor;
            position.updateCastles(start, end);
            position.enPassant = enPassant;
            position.fullMoveNumber = fullMoveNumber;
            position.halfMoveClock = halfMoveClock;
            position.squares[end] = piece;
            delete position.squares[start];
            position.fen = position.getFEN();
        };

        /**
         * Update the allowedCastles property.
         */
        position.updateCastles = function (start, end) {
            var castles = position.allowedCastles;
            var rows = [1, 8];
            if (castles === "-") {
                return;
            }
            rows.forEach(function (row, index) {
                var castleKing = chess.king;
                var castleQueen = chess.queen;
                if (index === 0) {
                    castleKing = castleKing.toUpperCase();
                    castleQueen = castleQueen.toUpperCase();
                }
                if (start === chess.columns.charAt(4) + row) {
                    castles = castles.replace(castleKing, "");
                    castles = castles.replace(castleQueen, "");
                } else if (start === chess.columns.charAt(0) + row ||
                    end === chess.columns.charAt(0) + row) {
                    castles = castles.replace(castleQueen, "");
                } else if (start === chess.columns.charAt(7) + row ||
                    end === chess.columns.charAt(7) + row) {
                    castles = castles.replace(castleKing, "");
                }
            });
            if (castles === "") {
                castles = "-";
            }
            position.allowedCastles = castles;
        };

        return position.create();
    }

    /**
     * The Game class to store the chessgame data.
     */
    function Game() {
        var game = {
            moves: [],
            pgnMoves: [],
            positions: [],
            tags: {}
        };

        /**
         * Add a move to the last position of the game.
         */
        game.addMove = function (start, end, promotion) {
            var lastIndex = 0;
            var lastPosition = {};
            var newPosition = {};
            lastIndex = game.moves.length;
            lastPosition = game.positions[lastIndex];
            // newPosition = lastPosition.getNext(start, end, promotion);
            // game.moves.push(start + "-" + end);
            game.positions.push(newPosition);
        };

        /**
         * Initialize and return the game object.
         */
        game.create = function () {
            var position = new Position(chess.defaultFEN);
            var requiredTags = {
                "Event": "?",
                "Site": "?",
                "Date": "????.??.??",
                "Round": "?",
                "White": "?",
                "Black": "?",
                "Result": "*"
            };
            game.positions.push(position);
            Object.keys(requiredTags).forEach(function (tag) {
                game.tags[tag] = requiredTags[tag];
            });
            return game;
        };

        /**
         * Return the Portable Game Notation.
         * https://www.chessclub.com/user/help/PGN-spec
         */
        game.getPGN = function () {
            var lineCount = 0;
            var lineFeed = "\n";
            var lineLimit = 80;
            var pgn = "";
            Object.keys(game.tags).forEach(function (tag) {
                var value = game.tags[tag];
                pgn += "[" + tag + " \"" + value + "\"]" + lineFeed;
            });
            game.pgnMoves.forEach(function (move, index) {
                var moveText = "";
                if (index % 2 === 0) {
                    moveText = ((index / 2) + 1) + ". ";
                }
                moveText += move;
                if (lineCount < lineLimit && index > 0) {
                    pgn += " " + moveText;
                    lineCount += 1 + moveText.length;
                } else {
                    pgn += lineFeed + moveText;
                    lineCount = moveText.length;
                }
            });
            return pgn + " " + game.tags.Result + lineFeed + lineFeed;
        };

        /**
         * Generate the moves and the positions from the PGN moves.
         */
        game.importMoves = function () {
            var lastPosition = game.positions[0];
            game.pgnMoves.forEach(function (pgnMove) {
                var move = lastPosition.getSimpleMove(pgnMove);
                lastPosition = lastPosition.getNext(move.start, move.arrival,
                    move.promotion);
                game.moves.push(move);
                game.positions.push(lastPosition);
            });
        };

        /**
         * Import the PGN moves from a PGN string.
         * Delete infos, comments and variations.
         */
        game.importPGNMoves = function (pgn) {
            var importedPGNMoves = [];
            pgn = pgn.replace(regExp.tagPair, "");
            while (regExp.comment.test(pgn)) {
                pgn = pgn.replace(regExp.comment, "");
            }
            while (regExp.variation.test(pgn)) {
                pgn = pgn.replace(regExp.variation, "");
            }
            pgn = pgn.replace(/\s{2,}/gm, " ");
            importedPGNMoves = pgn.match(regExp.pgnMove);
            importedPGNMoves.forEach(function (pgnMove) {
                pgnMove = pgnMove.replace(regExp.pgnMoveNumber, "");
                game.pgnMoves.push(pgnMove);
            });
        };

        /**
         * Import the tag pairs from a PGN string.
         */
        game.importTags = function (pgn) {
            var tags = pgn.match(regExp.tagPair);
            tags.forEach(function (tagPair) {
                var matches = regExp.tagPairCapture.exec(tagPair);
                game.tags[matches[1]] = matches[2];
            });
        };

        /**
         * Reset the game object and load a PGN.
         */
        game.setPGN = function (pgn) {
            game.moves = [];
            game.pgnMoves = [];
            game.positions = [];
            game.tags = {};
            game.create();
            game.importTags(pgn);
            game.importPGNMoves(pgn);
            game.importMoves();
        };

        return game.create();
    }

    /**
     * The Piece class to build chess pieces.
     * @param {string} name The character representing the piece.
     * @param {string} color The character representing the color.
     * @param {object} board The board containing the piece.
     */
    function Piece(name, color, board) {
        var piece = {
            board: board,
            color: color,
            element: {},
            ghost: {},
            isAnimated: false,
            name: name,
            url: "",
            width: 0
        };

        /**
         * Animate the piece movement.
         */
        piece.animate = function (animation) {
            var speed = board.options.animationSpeed;
            var x = animation.translates[0] * animation.iteration * speed;
            var y = animation.translates[1] * animation.iteration * speed;
            if (Math.abs(x) < animation.max && Math.abs(y) < animation.max) {
                piece.ghost.style.transform = "translate(" + x + "px, " +
                    y + "px)";
                animation.iteration += 1;
                raf(function () {
                    piece.animate(animation);
                });
            } else {
                raf(piece.endAnimation);
            }
        };

        /**
         * Initialize the piece animation.
         */
        piece.animateStart = function (start, destination) {
            var animation = {};
            var max = 0;
            var norms = [];
            var translates = [];
            start.forEach(function (value, index) {
                var direction = (destination[index] >= value)
                    ? 1
                    : -1;
                var distance = Math.abs(value - destination[index]);
                var norm = direction * distance;
                norms.push(norm);
            });
            max = Math.max(Math.abs(norms[0]), Math.abs(norms[1]));
            norms.forEach(function (norm) {
                translates.push(norm / max);
            });
            animation.translates = translates;
            animation.iteration = 1;
            animation.max = max;
            raf(function () {
                piece.isAnimated = true;
                piece.element.style.opacity = 0;
                piece.ghost.style.left = start[0] + "px";
                piece.ghost.style.top = start[1] + "px";
                document.body.appendChild(piece.ghost);
                piece.animate(animation);
            });
        };

        /**
         * Make the piece appear.
         */
        piece.appear = function () {
            var opacity = Number(piece.element.style.opacity) + 0.1;
            piece.element.style.opacity = opacity;
            if (opacity < 1) {
                raf(piece.appear);
            }
        };

        /**
         * Check if the piece can move to a square.
         */
        piece.canMoveTo = function (end) {
            var moves = board.position.getLegalMoves(board.startSquare.name);
            return moves.indexOf(end) > -1;
        };

        /**
         * Initialize and return the piece.
         */
        piece.create = function () {
            var image = "";
            piece.url = board.options.imagesPath + color + name +
                board.options.imagesExtension;
            image = "url('" + piece.url + "')";
            piece.element = document.createElement("div");
            piece.element.className = css.squarePiece;
            piece.element.style.backgroundImage = image;
            piece.ghost = document.createElement("div");
            piece.ghost.className = css.pieceGhost;
            piece.ghost.style.backgroundImage = image;
            piece.width = board.options.width / 8;
            piece.ghost.style.height = piece.width + "px";
            piece.ghost.style.width = piece.width + "px";
            return piece;
        };

        /**
         * Make the piece disappear.
         */
        piece.disappear = function (square) {
            var opacity = Number(piece.element.style.opacity) - 0.1;
            piece.element.style.opacity = opacity;
            if (opacity > 0) {
                raf(function () {
                    piece.disappear(square);
                });
            } else {
                raf(function () {
                    square.removePiece(piece);
                });
            }
        };

        /**
         * End the piece animation.
         */
        piece.endAnimation = function () {
            if (document.body === piece.ghost.parentNode) {
                document.body.removeChild(piece.ghost);
            }
            piece.ghost.style.transform = "";
            piece.element.style.opacity = 1;
            piece.isAnimated = false;
        };

        /**
         * Grab the piece.
         */
        piece.grab = function (e) {
            var left = e.clientX + window.pageXOffset - (piece.width / 2);
            var top = e.clientY + window.pageYOffset - (piece.width / 2);
            piece.ghost.style.left = left + "px";
            piece.ghost.style.top = top + "px";
            document.body.appendChild(piece.ghost);
            piece.element.style.opacity = 0;
        };

        /**
         * Move a piece from a square to another.
         */
        piece.moveFromTo = function (oldSquare, newSquare) {
            raf(function () {
                oldSquare.removePiece(piece);
                newSquare.placePiece(piece);
            });
        };

        return piece.create();
    }

    /**
     * The Square class to build the chessboard squares.
     * @param {string} column The character representing the column.
     * @param {string} row The character representing the row.
     * @param {object} board The board containing the square.
     */
    function Square(column, row, board) {
        var square = {
            board: board,
            canvas: {},
            column: column,
            element: {},
            hasCanvas: false,
            name: "",
            piece: null,
            row: row
        };

        /**
         * Initialize and return the square.
         */
        square.create = function () {
            var columnIndex = chess.columns.indexOf(square.column);
            var context = {};
            var rowIndex = chess.rows.indexOf(square.row);
            var width = board.options.width / 8;
            square.element = document.createElement("div");
            square.element.className = (columnIndex % 2 === rowIndex % 2)
                ? css.blackSquare
                : css.whiteSquare;
            square.name = column + row;
            square.canvas = document.createElement("canvas");
            square.canvas.setAttribute("height", width + "px");
            square.canvas.setAttribute("width", width + "px");
            square.canvas.className = css.squareCanvas;
            context = square.canvas.getContext("2d");
            context.beginPath();
            context.arc(width / 2, width / 2, width / 10, 0, 2 * Math.PI);
            context.fillStyle = board.options.legalMarksColor;
            context.fill();
            if (board.options.clickable) {
                square.element.addEventListener("click", square.onClick);
            }
            if (board.options.draggable) {
                square.element.addEventListener("mousedown",
                    square.onMouseDown);
                square.element.addEventListener("mouseenter",
                    square.onMouseEnterLeave);
                square.element.addEventListener("mouseleave",
                    square.onMouseEnterLeave);
                square.element.addEventListener("mouseup", square.onMouseUp);
            }
            return square;
        };

        /**
         * Deselect the start square of the board.
         */
        square.deselect = function () {
            board.startSquare = null;
            raf(function () {
                square.element.classList.remove(css.startSquare);
            });
            if (board.options.markLegalSquares) {
                board.squares.forEach(function (value) {
                    if (value.hasCanvas) {
                        board.toggleCanvas(value.name);
                    }
                });
            }
        };

        /**
         * Square click event handler.
         */
        square.onClick = function () {
            var isLegal = false;
            var piece = square.piece;
            var sameSquare = false;
            if (board.startSquare !== null) {
                sameSquare = square === board.startSquare;
                if (board.startSquare.piece.canMoveTo(square.name)) {
                    board.playMove(board.startSquare.name, square.name);
                    isLegal = true;
                }
                board.startSquare.deselect();
            }
            if (piece !== null && !sameSquare && !board.hasDraggedStart &&
                !isLegal && !piece.isAnimated) {
                square.select();
            }
            board.hasDraggedStart = false;
        };

        /**
         * Square mousedown event handler.
         */
        square.onMouseDown = function (e) {
            var piece = square.piece;
            e.preventDefault();
            if (piece === null || e.button !== 0 || piece.isAnimated) {
                return;
            }
            if (board.startSquare !== null) {
                if (board.startSquare.piece.canMoveTo(square.name)) {
                    return;
                }
                if (board.startSquare === square) {
                    board.hasDraggedStart = true;
                }
                board.startSquare.deselect();
            }
            board.isDragging = true;
            square.select();
            raf(function () {
                square.element.classList.add(css.overflownSquare);
                piece.grab(e);
            });
        };

        /**
         * Square mouseenter mouseleave event handler.
         */
        square.onMouseEnterLeave = function () {
            if (board.isDragging) {
                square.element.classList.toggle(css.overflownSquare);
            }
        };

        /**
         * Square mouseup event handler.
         */
        square.onMouseUp = function () {
            var end = [];
            var piece = {};
            var start = [];
            if (!board.isDragging) {
                return;
            }
            piece = board.startSquare.piece;
            start = getCoordinates(piece.ghost);
            end = getCoordinates(square.element);
            if (square !== board.startSquare) {
                if (piece.canMoveTo(square.name)) {
                    board.playMove(board.startSquare.name, square.name, false);
                } else {
                    end = getCoordinates(board.startSquare.element);
                }
            }
            piece.animateStart(start, end);
            raf(function () {
                square.element.classList.remove(css.overflownSquare);
            });
            board.startSquare.deselect();
            board.isDragging = false;
        };

        /**
         * Place a piece on the square.
         */
        square.placePiece = function (piece) {
            if (square.piece !== null) {
                square.piece.disappear(square);
            }
            square.piece = piece;
            square.element.appendChild(piece.element);
        };

        /**
         * Remove a piece of the square.
         */
        square.removePiece = function (piece) {
            if (square.element === piece.element.parentNode) {
                square.element.removeChild(piece.element);
            }
            if (piece === square.piece) {
                square.piece = null;
            }
        };

        /**
         * Select the piece on the square.
         */
        square.select = function () {
            var moves = [];
            board.startSquare = square;
            raf(function () {
                square.element.classList.add(css.startSquare);
            });
            if (board.options.markLegalSquares) {
                moves = board.position.getLegalMoves(square.name);
                moves.forEach(board.toggleCanvas);
            }
        };

        return square.create();
    }

    /**
     * The Board class to build HTML chessboards.
     * @param {string} id The id of the container.
     * @param {object} options The configuration object.
     */
    function Board(id, options) {
        var board = {
            columnsBorder: {},
            container: {},
            element: {},
            game: {},
            hasDraggedStart: false,
            hasNotation: false,
            isDragging: false,
            isFlipped: false,
            options: options,
            pendingMove: {},
            position: {},
            promotionDiv: {},
            rowsBorder: {},
            squares: [],
            startSquare: null
        };

        /**
         * Initialize and return the board.
         */
        board.create = function () {
            var choices = [chess.queen, chess.rook, chess.bishop, chess.knight];
            board.position = new Position(chess.emptyFEN);
            board.element = document.createElement("div");
            board.element.className = css.squares;
            chess.columns.split("").forEach(function (column) {
                chess.rows.split("").forEach(function (row) {
                    var square = new Square(column, row, board);
                    board.squares.push(square);
                });
            });
            board.container = document.getElementById(id);
            board.promotionDiv = document.createElement("div");
            board.promotionDiv.className = css.promotionDiv;
            choices.forEach(function (choice) {
                var button = document.createElement("button");
                button.className = css.promotionButton;
                button.name = choice;
                button.addEventListener("click", board.onPromotionChoose);
                board.promotionDiv.appendChild(button);
            });
            if (options.draggable) {
                document.addEventListener("mousemove", board.onMouseMove);
                document.addEventListener("mouseup", board.onMouseUp);
            }
            board.game = new Game();
            return board;
        };

        /**
         * Create the notation border.
         */
        board.createBorder = function () {
            var border = {};
            var className = "";
            var columns = chess.columns.split("");
            var rows = chess.rows.split("");
            if (board.isFlipped) {
                columns = columns.reverse();
            } else {
                rows = rows.reverse();
            }
            function createFragment(text) {
                var fragment = document.createElement("div");
                fragment.innerText = text;
                fragment.className = className;
                border.appendChild(fragment);
            }
            board.columnsBorder = document.createElement("div");
            board.columnsBorder.className = css.columnsBorder;
            border = board.columnsBorder;
            className = css.columnsBorderFragment;
            columns.forEach(createFragment);
            board.rowsBorder = document.createElement("div");
            board.rowsBorder.className = css.rowsBorder;
            border = board.rowsBorder;
            className = css.rowsBorderFragment;
            rows.forEach(createFragment);
        };

        /**
         * Draw the board.
         */
        board.draw = function () {
            var columns = chess.columns.split("");
            var rows = chess.rows.split("");
            if (board.isFlipped) {
                columns = columns.reverse();
            } else {
                rows = rows.reverse();
            }
            rows.forEach(function (row) {
                columns.forEach(function (column) {
                    var square = board.getSquare(column + row);
                    board.element.appendChild(square.element);
                });
            });
            board.container.appendChild(board.element);
            board.element.appendChild(board.promotionDiv);
            if (board.hasNotation) {
                board.createBorder();
                board.container.insertBefore(board.rowsBorder, board.element);
                board.container.appendChild(board.columnsBorder);
            }
        };

        /**
         * Return the animations to do between two positions.
         */
        board.getAnimations = function (position) {
            var animations = [];
            var columns = chess.columns.split("");
            var futureSquares = [];
            var pastSquares = [];
            var rows = chess.rows.split("");
            rows.forEach(function (row) {
                columns.forEach(function (column) {
                    var square = column + row;
                    if (board.position.squares[square] === position[square]) {
                        return;
                    }
                    if (!board.position.squares.hasOwnProperty(square)) {
                        futureSquares.push(square);
                        return;
                    }
                    if (!position.hasOwnProperty(square)) {
                        pastSquares.push(square);
                        return;
                    }
                    futureSquares.push(square);
                    pastSquares.push(square);
                });
            });
            futureSquares.forEach(function (futureSquare) {
                var animation = {};
                var char = position[futureSquare];
                var color = "";
                var endSquare = {};
                var existsInPast = false;
                var start = "";
                var startSquare = {};
                existsInPast = pastSquares.some(function (pastSquare, i) {
                    start = pastSquare;
                    if (board.position.squares[pastSquare] === char) {
                        pastSquares.splice(i, 1);
                        return true;
                    }
                    return false;
                });
                endSquare = board.getSquare(futureSquare);
                if (existsInPast) {
                    startSquare = board.getSquare(start);
                    animation.piece = startSquare.piece;
                    animation.start = startSquare;
                } else {
                    animation.start = null;
                    color = (char.toUpperCase() === char)
                        ? chess.white
                        : chess.black;
                    char = char.toLowerCase();
                    animation.piece = new Piece(char, color, board);
                }
                animation.end = endSquare;
                animations.push(animation);
            });
            pastSquares.forEach(function (square) {
                var animation = {};
                var startSquare = board.getSquare(square);
                animation.piece = startSquare.piece;
                animation.start = startSquare;
                animation.end = null;
                animations.push(animation);
            });
            return animations;
        };

        /**
         * Return a square by giving its name.
         */
        board.getSquare = function (name) {
            var square = {};
            board.squares.some(function (item) {
                if (item.name === name) {
                    square = item;
                    return true;
                }
                return false;
            });
            return square;
        };

        /**
         * Animate and move a piece.
         */
        board.movePiece = function (start, end, animate) {
            var endXY = [];
            var endSquare = board.getSquare(end);
            var startXY = [];
            var startSquare = board.getSquare(start);
            if (typeof animate !== "boolean") {
                animate = true;
            }
            if (animate) {
                startXY = getCoordinates(startSquare.element);
                endXY = getCoordinates(endSquare.element);
                startSquare.piece.animateStart(startXY, endXY);
            }
            startSquare.piece.moveFromTo(startSquare, endSquare);
        };

        /**
         * Document mousemove event handler.
         */
        board.onMouseMove = function (e) {
            var ghost = {};
            var left = 0;
            var top = 0;
            if (!board.isDragging) {
                return;
            }
            ghost = board.startSquare.piece.ghost;
            raf(function () {
                left = e.clientX + window.pageXOffset - (options.width / 16);
                top = e.clientY + window.pageYOffset - (options.width / 16);
                ghost.style.left = left + "px";
                ghost.style.top = top + "px";
            });
        };

        /**
         * Document mouseup event handler.
         */
        board.onMouseUp = function () {
            var destination = [];
            var start = [];
            if (!board.isDragging) {
                return;
            }
            start = getCoordinates(board.startSquare.piece.ghost);
            destination = getCoordinates(board.startSquare.element);
            board.startSquare.piece.animateStart(start, destination);
            board.startSquare.deselect();
            board.isDragging = false;
        };

        /**
         * Promotion button click event handler.
         */
        board.onPromotionChoose = function (e) {
            var choice = e.target.name;
            var end = board.pendingMove.end;
            var piece = new Piece(choice, board.position.activeColor, board);
            var square = board.getSquare(end);
            var start = board.pendingMove.start;
            if (piece.color === chess.white) {
                choice = choice.toUpperCase();
            }
            board.position.update(start, end, choice);
            board.movePiece(start, end);
            board.game.addMove(start, end);
            events.onMovePlayed();
            raf(function () {
                board.promotionDiv.style.display = "none";
                square.placePiece(piece);
                piece.appear();
            });
        };

        /**
         * Perform the animations.
         */
        board.performAnimations = function (animations) {
            animations.forEach(function (animation) {
                if (animation.end === null) {
                    raf(function () {
                        animation.piece.disappear(animation.start);
                    });
                }
            });
            animations.forEach(function (animation) {
                var end = [];
                var start = [];
                if (animation.start === null || animation.end === null) {
                    return;
                }
                start = getCoordinates(animation.start.element);
                end = getCoordinates(animation.end.element);
                animation.piece.animateStart(start, end);
                animation.piece.moveFromTo(animation.start, animation.end);
            });
            animations.forEach(function (animation) {
                if (animation.start !== null) {
                    return;
                }
                raf(function () {
                    animation.end.placePiece(animation.piece);
                    animation.piece.appear();
                });
            });
        };

        /**
         * Play a move and manage special moves.
         */
        board.playMove = function (start, end, animate) {
            var startSquare = board.getSquare(start);
            if (startSquare.piece.name === chess.pawn) {
                if (board.position.enPassant === end) {
                    board.triggerEnPassant();
                } else if (regExp.promotionEnd.test(end)) {
                    board.triggerPromotion(start, end);
                    return;
                }
            } else if (startSquare.piece.name === chess.king &&
                regExp.castleStart.test(start) && regExp.castleEnd.test(end)) {
                board.triggerCastle(end);
            }
            board.position.update(start, end);
            board.movePiece(start, end, animate);
            board.game.addMove(start, end);
            events.onMovePlayed();
        };

        /**
         * Set a position from a position object.
         * @param {Object} position The position to set on the board.
         */
        board.setPosition = function (position) {
            var animations = [];
            if (board.startSquare !== null) {
                board.startSquare.deselect();
            }
            animations = board.getAnimations(position.squares);
            board.performAnimations(animations);
            board.position = position;
        };

        /**
         * Show / hide the canvas of a square.
         */
        board.toggleCanvas = function (squareName) {
            var square = board.getSquare(squareName);
            raf(function () {
                if (square.hasCanvas) {
                    square.element.removeChild(square.canvas);
                } else {
                    square.element.appendChild(square.canvas);
                }
                square.hasCanvas = !square.hasCanvas;
            });
        };

        /**
         * Move the rook to complete a castle.
         */
        board.triggerCastle = function (end) {
            var rookEnd = "";
            var rookStart = "";
            if (end.charAt(0) === chess.columns.charAt(2)) {
                rookStart = chess.columns.charAt(0);
                rookEnd = chess.columns.charAt(3);
            } else {
                rookStart = chess.columns.charAt(7);
                rookEnd = chess.columns.charAt(5);
            }
            rookStart += end.charAt(1);
            rookEnd += end.charAt(1);
            board.movePiece(rookStart, rookEnd);
        };

        /**
         * Remove the pawn taken en passant.
         */
        board.triggerEnPassant = function () {
            var capture = "";
            var captureRow = 0;
            var captureSquare = {};
            captureRow = (board.position.activeColor === chess.white)
                ? 5
                : 4;
            capture = board.position.enPassant.charAt(0) + captureRow;
            captureSquare = board.getSquare(capture);
            captureSquare.piece.disappear(captureSquare);
        };

        /**
         * Ask for promotion choice.
         */
        board.triggerPromotion = function (start, end) {
            var buttons = board.promotionDiv.children;
            var color = board.position.activeColor;
            Object.keys(buttons).forEach(function (key) {
                var button = buttons[key];
                var url = board.options.imagesPath + color + button.name +
                    board.options.imagesExtension;
                button.style.backgroundImage = "url('" + url + "')";
            });
            board.pendingMove.start = start;
            board.pendingMove.end = end;
            raf(function () {
                board.promotionDiv.style.display = "block";
            });
        };

        return board.create();
    }

    (function () {
        if (typeof abOptions === "object") {
            Object.keys(defaultOptions).forEach(function (key) {
                if (!abOptions.hasOwnProperty(key)) {
                    abOptions[key] = defaultOptions[key];
                }
            });
        } else {
            abOptions = defaultOptions;
        }
        abBoard = new Board(abId, abOptions);
    }());

    /**
     * Return the API.
     */
    return {
        board: {
            draw: function (flipped, notation) {
                if (typeof flipped !== "boolean") {
                    flipped = false;
                }
                if (typeof notation !== "boolean") {
                    notation = true;
                }
                abBoard.hasNotation = notation;
                abBoard.isFlipped = flipped;
                abBoard.draw();
            },
            flip: function () {
                while (abBoard.container.hasChildNodes()) {
                    abBoard.container.removeChild(abBoard.container.lastChild);
                }
                abBoard.isFlipped = !abBoard.isFlipped;
                abBoard.draw();
            },
            getFEN: function () {
                return abBoard.position.getFEN();
            },
            move: function (start, destination) {
                abBoard.playMove(start, destination, true);
            },
            onMovePlayed: function (callback) {
                events.onMovePlayed = callback;
            },
            setFEN: function (fen) {
                var position = {};
                fen = fen || chess.defaultFEN;
                position = new Position(fen);
                abBoard.setPosition(position);
            }
        },
        game: {
            getInfo: function (info) {
                return abBoard.game.tags[info];
            },
            getMoves: function () {
                return abBoard.game.moves;
            },
            getMovesPGN: function (symbols) {
                var pgnMoves = abBoard.game.pgnMoves;
                var htmlMoves = [];
                if (symbols === undefined || !symbols) {
                    return pgnMoves;
                }
                pgnMoves.forEach(function (pgnMove) {
                    pgnMove = pgnMove.replace("B", chess.htmlWhiteBishop);
                    pgnMove = pgnMove.replace("K", chess.htmlWhiteKing);
                    pgnMove = pgnMove.replace("N", chess.htmlWhiteKnight);
                    pgnMove = pgnMove.replace("Q", chess.htmlWhiteQueen);
                    pgnMove = pgnMove.replace("R", chess.htmlWhiteRook);
                    htmlMoves.push(pgnMove);
                });
                return htmlMoves;
            },
            getPGN: function () {
                return abBoard.game.getPGN();
            },
            setPGN: function (pgn) {
                abBoard.game.setPGN(pgn);
            },
            view: function (index) {
                var position = abBoard.game.positions[index];
                abBoard.setPosition(position);
            }
        }
    };
};