/**
 * Copyright (c) 2010, Jason Davies.
 *
 * All rights reserved.  This code is based on Bradley White's Java version,
 * which is in turn based on Nicholas Yue's C++ version, which in turn is based
 * on Paul D. Bourke's original Fortran version.  See below for the respective
 * copyright notices.
 *
 * See http://paulbourke.net/papers/conrec for the original
 * paper by Paul D. Bourke.
 *
 * The vector conversion code is based on http://apptree.net/conrec.htm by
 * Graham Cox.
 *
 * Redistribution and use in source and binary forms, with or without
 * modification, are permitted provided that the following conditions are met:
 *     * Redistributions of source code must retain the above copyright
 *       notice, this list of conditions and the following disclaimer.
 *     * Redistributions in binary form must reproduce the above copyright
 *       notice, this list of conditions and the following disclaimer in the
 *       documentation and/or other materials provided with the distribution.
 *     * Neither the name of the <organization> nor the
 *       names of its contributors may be used to endorse or promote products
 *       derived from this software without specific prior written permission.
 *
 * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS"
 * AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE
 * IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE
 * ARE DISCLAIMED. IN NO EVENT SHALL <COPYRIGHT HOLDER> BE LIABLE FOR ANY
 * DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES
 * (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES;
 * LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND
 * ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
 * (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF
 * THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 */

/*
 * Copyright (c) 1996-1997 Nicholas Yue
 *
 * This software is copyrighted by Nicholas Yue. This code is based on Paul D.
 * Bourke's CONREC.F routine.
 *
 * The authors hereby grant permission to use, copy, and distribute this
 * software and its documentation for any purpose, provided that existing
 * copyright notices are retained in all copies and that this notice is
 * included verbatim in any distributions. Additionally, the authors grant
 * permission to modify this software and its documentation for any purpose,
 * provided that such modifications are not distributed without the explicit
 * consent of the authors and that existing copyright notices are retained in
 * all copies. Some of the algorithms implemented by this software are
 * patented, observe all applicable patent law.
 *
 * IN NO EVENT SHALL THE AUTHORS OR DISTRIBUTORS BE LIABLE TO ANY PARTY FOR
 * DIRECT, INDIRECT, SPECIAL, INCIDENTAL, OR CONSEQUENTIAL DAMAGES ARISING OUT
 * OF THE USE OF THIS SOFTWARE, ITS DOCUMENTATION, OR ANY DERIVATIVES THEREOF,
 * EVEN IF THE AUTHORS HAVE BEEN ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 *
 * THE AUTHORS AND DISTRIBUTORS SPECIFICALLY DISCLAIM ANY WARRANTIES,
 * INCLUDING, BUT NOT LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE, AND NON-INFRINGEMENT.  THIS SOFTWARE IS
 * PROVIDED ON AN "AS IS" BASIS, AND THE AUTHORS AND DISTRIBUTORS HAVE NO
 * OBLIGATION TO PROVIDE MAINTENANCE, SUPPORT, UPDATES, ENHANCEMENTS, OR
 * MODIFICATIONS.
 */
!function(){
  var Conrec = (function() {
    var EPSILON = 1e-20;

    var pointsEqual = function(a, b) {
      var x = a.x - b.x, y = a.y - b.y;
      return x * x + y * y < EPSILON;
    }

    var reverseList = function(list) {
      var pp = list.head;

      while (pp) {
        // swap prev/next pointers
        var temp = pp.next;
        pp.next = pp.prev;
        pp.prev = temp;

        // continue through the list
        pp = temp;
      }

      // swap head/tail pointers
      var temp = list.head;
      list.head = list.tail;
      list.tail = temp;
    }

    var ContourBuilder = function(level) {
      this.level = level;
      this.s = null;
      this.count = 0;
    }
    ContourBuilder.prototype.remove_seq = function(list) {
      // if list is the first item, static ptr s is updated
      if (list.prev) {
        list.prev.next = list.next;
      } else {
        this.s = list.next;
      }

      if (list.next) {
        list.next.prev = list.prev;
      }
      --this.count;
    }
    ContourBuilder.prototype.addSegment = function(a, b) {
      var ss = this.s;
      var ma = null;
      var mb = null;
      var prependA = false;
      var prependB = false;

      while (ss) {
        if (ma == null) {
          // no match for a yet
          if (pointsEqual(a, ss.head.p)) {
            ma = ss;
            prependA = true;
          } else if (pointsEqual(a, ss.tail.p)) {
            ma = ss;
          }
        }
        if (mb == null) {
          // no match for b yet
          if (pointsEqual(b, ss.head.p)) {
            mb = ss;
            prependB = true;
          } else if (pointsEqual(b, ss.tail.p)) {
            mb = ss;
          }
        }
        // if we matched both no need to continue searching
        if (mb != null && ma != null) {
          break;
        } else {
          ss = ss.next;
        }
      }

      // c is the case selector based on which of ma and/or mb are set
      var c = ((ma != null) ? 1 : 0) | ((mb != null) ? 2 : 0);

      switch(c) {
        case 0:   // both unmatched, add as new sequence
          var aa = {p: a, prev: null};
          var bb = {p: b, next: null};
          aa.next = bb;
          bb.prev = aa;

          // create sequence element and push onto head of main list. The order
          // of items in this list is unimportant
          ma = {head: aa, tail: bb, next: this.s, prev: null, closed: false};
          if (this.s) {
            this.s.prev = ma;
          }
          this.s = ma;

          ++this.count;    // not essential - tracks number of unmerged sequences
        break;

        case 1:   // a matched, b did not - thus b extends sequence ma
          var pp = {p: b};

          if (prependA) {
            pp.next = ma.head;
            pp.prev = null;
            ma.head.prev = pp;
            ma.head = pp;
          } else {
            pp.next = null;
            pp.prev = ma.tail;
            ma.tail.next = pp;
            ma.tail = pp;
          }
        break;

        case 2:   // b matched, a did not - thus a extends sequence mb
          var pp = {p: a};

          if (prependB) {
            pp.next = mb.head;
            pp.prev = null;
            mb.head.prev = pp;
            mb.head = pp;
          } else {
            pp.next = null;
            pp.prev = mb.tail;
            mb.tail.next = pp;
            mb.tail = pp;
          }
        break;

        case 3:   // both matched, can merge sequences
          // if the sequences are the same, do nothing, as we are simply closing this path (could set a flag)

          if (ma === mb) {
            var pp = {p: ma.tail.p, next: ma.head, prev: null};
            ma.head.prev = pp;
            ma.head = pp;
            ma.closed = true;
            break;
          }

          // there are 4 ways the sequence pair can be joined. The current setting of prependA and
          // prependB will tell us which type of join is needed. For head/head and tail/tail joins
          // one sequence needs to be reversed
          switch((prependA ? 1 : 0) | (prependB ? 2 : 0)) {
            case 0:   // tail-tail
              // reverse ma and append to mb
              reverseList(ma);
              // fall through to head/tail case
            case 1:   // head-tail
              // ma is appended to mb and ma discarded
              mb.tail.next = ma.head;
              ma.head.prev = mb.tail;
              mb.tail = ma.tail;

              //discard ma sequence record
              this.remove_seq(ma);
            break;

            case 3:   // head-head
              // reverse ma and append mb to it
              reverseList(ma);
              // fall through to tail/head case
            case 2:   // tail-head
              // mb is appended to ma and mb is discarded
              ma.tail.next = mb.head;
              mb.head.prev = ma.tail;
              ma.tail = mb.tail;

              //discard mb sequence record
              this.remove_seq(mb);
          break;
        }
      }
    }

    /**
     * Implements CONREC.
     *
     * @param {function} drawContour function for drawing contour.  Defaults to a
     *                               custom "contour builder", which populates the
     *                               contours property.
     */
    var Conrec = function(drawContour) {
      if (!drawContour) {
        var c = this;
        c.contours = {};
        /**
         * drawContour - interface for implementing the user supplied method to
         * render the countours.
         *
         * Draws a line between the start and end coordinates.
         *
         * @param startX    - start coordinate for X
         * @param startY    - start coordinate for Y
         * @param endX      - end coordinate for X
         * @param endY      - end coordinate for Y
         * @param contourLevel - Contour level for line.
         */
        this.drawContour = function(startX, startY, endX, endY, contourLevel, k) {
          var cb = c.contours[k];
          if (!cb) {
            cb = c.contours[k] = new ContourBuilder(contourLevel);
          }
          cb.addSegment({x: startX, y: startY}, {x: endX, y: endY});
        }
        this.contourList = function() {
          var l = [];
          var a = c.contours;
          for (var k in a) {
            var s = a[k].s;
            var level = a[k].level;
            while (s) {
              var h = s.head;
              var l2 = [];
              l2.level = level;
              l2.k = k;
              while (h && h.p) {
                l2.push(h.p);
                h = h.next;
              }
              l.push(l2);
              s = s.next;
            }
          }
          l.sort(function(a, b) { return b.k - a.k });
          return l;
        }
      } else {
        this.drawContour = drawContour;
      }
      this.h  = new Array(5);
      this.sh = new Array(5);
      this.xh = new Array(5);
      this.yh = new Array(5);
    }

    /**
     * contour is a contouring subroutine for rectangularily spaced data
     *
     * It emits calls to a line drawing subroutine supplied by the user which
     * draws a contour map corresponding to real*4data on a randomly spaced
     * rectangular grid. The coordinates emitted are in the same units given in
     * the x() and y() arrays.
     *
     * Any number of contour levels may be specified but they must be in order of
     * increasing value.
     *
     *
     * @param {number[][]} d - matrix of data to contour
     * @param {number} ilb,iub,jlb,jub - index bounds of data matrix
     *
     *             The following two, one dimensional arrays (x and y) contain
     *             the horizontal and vertical coordinates of each sample points.
     * @param {number[]} x  - data matrix column coordinates
     * @param {number[]} y  - data matrix row coordinates
     * @param {number} nc   - number of contour levels
     * @param {number[]} z  - contour levels in increasing order.
     */
    Conrec.prototype.contour = function(d, ilb, iub, jlb, jub, x, y, nc, z) {
      var h = this.h, sh = this.sh, xh = this.xh, yh = this.yh;
      var drawContour = this.drawContour;
      this.contours = {};

      /** private */
      var xsect = function(p1, p2){
        return (h[p2]*xh[p1]-h[p1]*xh[p2])/(h[p2]-h[p1]);
      }

      var ysect = function(p1, p2){
        return (h[p2]*yh[p1]-h[p1]*yh[p2])/(h[p2]-h[p1]);
      }
      var m1;
      var m2;
      var m3;
      var case_value;
      var dmin;
      var dmax;
      var x1 = 0.0;
      var x2 = 0.0;
      var y1 = 0.0;
      var y2 = 0.0;

      // The indexing of im and jm should be noted as it has to start from zero
      // unlike the fortran counter part
      var im = [0, 1, 1, 0];
      var jm = [0, 0, 1, 1];

      // Note that castab is arranged differently from the FORTRAN code because
      // Fortran and C/C++ arrays are transposed of each other, in this case
      // it is more tricky as castab is in 3 dimensions
      var castab = [
        [
          [0, 0, 8], [0, 2, 5], [7, 6, 9]
        ],
        [
          [0, 3, 4], [1, 3, 1], [4, 3, 0]
        ],
        [
          [9, 6, 7], [5, 2, 0], [8, 0, 0]
        ]
      ];

      for (var j=(jub-1);j>=jlb;j--) {
        for (var i=ilb;i<=iub-1;i++) {
          var temp1, temp2;
          temp1 = Math.min(d[i][j],d[i][j+1]);
          temp2 = Math.min(d[i+1][j],d[i+1][j+1]);
          dmin  = Math.min(temp1,temp2);
          temp1 = Math.max(d[i][j],d[i][j+1]);
          temp2 = Math.max(d[i+1][j],d[i+1][j+1]);
          dmax  = Math.max(temp1,temp2);

          if (dmax>=z[0]&&dmin<=z[nc-1]) {
            for (var k=0;k<nc;k++) {
              if (z[k]>=dmin&&z[k]<=dmax) {
                for (var m=4;m>=0;m--) {
                  if (m>0) {
                    // The indexing of im and jm should be noted as it has to
                    // start from zero
                    h[m] = d[i+im[m-1]][j+jm[m-1]]-z[k];
                    xh[m] = x[i+im[m-1]];
                    yh[m] = y[j+jm[m-1]];
                  } else {
                    h[0] = 0.25*(h[1]+h[2]+h[3]+h[4]);
                    xh[0]=0.5*(x[i]+x[i+1]);
                    yh[0]=0.5*(y[j]+y[j+1]);
                  }
                  if (h[m]>0.0) {
                    sh[m] = 1;
                  } else if (h[m]<0.0) {
                    sh[m] = -1;
                  } else
                    sh[m] = 0;
                }
                //
                // Note: at this stage the relative heights of the corners and the
                // centre are in the h array, and the corresponding coordinates are
                // in the xh and yh arrays. The centre of the box is indexed by 0
                // and the 4 corners by 1 to 4 as shown below.
                // Each triangle is then indexed by the parameter m, and the 3
                // vertices of each triangle are indexed by parameters m1,m2,and
                // m3.
                // It is assumed that the centre of the box is always vertex 2
                // though this isimportant only when all 3 vertices lie exactly on
                // the same contour level, in which case only the side of the box
                // is drawn.
                //
                //
                //      vertex 4 +-------------------+ vertex 3
                //               | \               / |
                //               |   \    m-3    /   |
                //               |     \       /     |
                //               |       \   /       |
                //               |  m=2    X   m=2   |       the centre is vertex 0
                //               |       /   \       |
                //               |     /       \     |
                //               |   /    m=1    \   |
                //               | /               \ |
                //      vertex 1 +-------------------+ vertex 2
                //
                //
                //
                //               Scan each triangle in the box
                //
                for (m=1;m<=4;m++) {
                  m1 = m;
                  m2 = 0;
                  if (m!=4) {
                      m3 = m+1;
                  } else {
                      m3 = 1;
                  }
                  case_value = castab[sh[m1]+1][sh[m2]+1][sh[m3]+1];
                  if (case_value!=0) {
                    switch (case_value) {
                      case 1: // Line between vertices 1 and 2
                        x1=xh[m1];
                        y1=yh[m1];
                        x2=xh[m2];
                        y2=yh[m2];
                        break;
                      case 2: // Line between vertices 2 and 3
                        x1=xh[m2];
                        y1=yh[m2];
                        x2=xh[m3];
                        y2=yh[m3];
                        break;
                      case 3: // Line between vertices 3 and 1
                        x1=xh[m3];
                        y1=yh[m3];
                        x2=xh[m1];
                        y2=yh[m1];
                        break;
                      case 4: // Line between vertex 1 and side 2-3
                        x1=xh[m1];
                        y1=yh[m1];
                        x2=xsect(m2,m3);
                        y2=ysect(m2,m3);
                        break;
                      case 5: // Line between vertex 2 and side 3-1
                        x1=xh[m2];
                        y1=yh[m2];
                        x2=xsect(m3,m1);
                        y2=ysect(m3,m1);
                        break;
                      case 6: //  Line between vertex 3 and side 1-2
                        x1=xh[m3];
                        y1=yh[m3];
                        x2=xsect(m1,m2);
                        y2=ysect(m1,m2);
                        break;
                      case 7: // Line between sides 1-2 and 2-3
                        x1=xsect(m1,m2);
                        y1=ysect(m1,m2);
                        x2=xsect(m2,m3);
                        y2=ysect(m2,m3);
                        break;
                      case 8: // Line between sides 2-3 and 3-1
                        x1=xsect(m2,m3);
                        y1=ysect(m2,m3);
                        x2=xsect(m3,m1);
                        y2=ysect(m3,m1);
                        break;
                      case 9: // Line between sides 3-1 and 1-2
                        x1=xsect(m3,m1);
                        y1=ysect(m3,m1);
                        x2=xsect(m1,m2);
                        y2=ysect(m1,m2);
                        break;
                      default:
                        break;
                    }
                    // Put your processing code here and comment out the printf
                    //printf("%f %f %f %f %f\n",x1,y1,x2,y2,z[k]);
                    drawContour(x1,y1,x2,y2,z[k],k);
                  }
                }
              }
            }
          }
        }
      }
    }
    return Conrec;
  })();

  var MIN_POINT_NUM = 30;
  function sortEsc(arr){
    arr.sort(function(a, b){
      return a - b;
    });
  }
  function sortDesc(arr){
    arr.sort(function(a, b){
      return b - a;
    });
  }
  //面积为正可以判断多边型正面，面积为负表示多边形背面
  function getArea(points){
    var S = 0;
    for(var i = 0, j = points.length - 1; i<j; i++){
      var p_a = points[i],
        p_b = points[i + 1];
      S += p_a.x * p_b.y - p_b.x*p_a.y;
    }
    var p_a = points[j],
      p_b = points[0];
    S += p_a.x * p_b.y - p_b.x*p_a.y;
    return S/2;
  }
  // B样条插值平滑算法
  var smoothBSpline = (function(){
    // https://github.com/Tagussan/BSpline
    var BSpline = function(points,degree,copy){
        if(copy){
            this.points = []
            for(var i = 0;i<points.length;i++){
                this.points.push(points[i]);
            }
        }else{
            this.points = points;
        }
        this.degree = degree;
        this.dimension = points[0].length;
        if(degree == 2){
            this.baseFunc = this.basisDeg2;
            this.baseFuncRangeInt = 2;
        }else if(degree == 3){
            this.baseFunc = this.basisDeg3;
            this.baseFuncRangeInt = 2;
        }else if(degree == 4){
            this.baseFunc = this.basisDeg4;
            this.baseFuncRangeInt = 3;
        }else if(degree == 5){
            this.baseFunc = this.basisDeg5;
            this.baseFuncRangeInt = 3;
        }
    };

    BSpline.prototype.seqAt = function(dim){
        var points = this.points;
        var margin = this.degree + 1;
        return function(n){
            if(n < margin){
                return points[0][dim];
            }else if(points.length + margin <= n){
                return points[points.length-1][dim];
            }else{
                return points[n-margin][dim];
            }
        };
    };

    BSpline.prototype.basisDeg2 = function(x){
        if(-0.5 <= x && x < 0.5){
            return 0.75 - x*x;
        }else if(0.5 <= x && x <= 1.5){
            return 1.125 + (-1.5 + x/2.0)*x;
        }else if(-1.5 <= x && x < -0.5){
            return 1.125 + (1.5 + x/2.0)*x;
        }else{
            return 0;
        }
    };

    BSpline.prototype.basisDeg3 = function(x){
        if(-1 <= x && x < 0){
            return 2.0/3.0 + (-1.0 - x/2.0)*x*x;
        }else if(1 <= x && x <= 2){
            return 4.0/3.0 + x*(-2.0 + (1.0 - x/6.0)*x);
        }else if(-2 <= x && x < -1){
            return 4.0/3.0 + x*(2.0 + (1.0 + x/6.0)*x);
        }else if(0 <= x && x < 1){
            return 2.0/3.0 + (-1.0 + x/2.0)*x*x;
        }else{
            return 0;
        }
    };

    BSpline.prototype.basisDeg4 = function(x){
        if(-1.5 <= x && x < -0.5){
            return 55.0/96.0 + x*(-(5.0/24.0) + x*(-(5.0/4.0) + (-(5.0/6.0) - x/6.0)*x));
        }else if(0.5 <= x && x < 1.5){
            return 55.0/96.0 + x*(5.0/24.0 + x*(-(5.0/4.0) + (5.0/6.0 - x/6.0)*x));
        }else if(1.5 <= x && x <= 2.5){
            return 625.0/384.0 + x*(-(125.0/48.0) + x*(25.0/16.0 + (-(5.0/12.0) + x/24.0)*x));
        }else if(-2.5 <= x && x <= -1.5){
            return 625.0/384.0 + x*(125.0/48.0 + x*(25.0/16.0 + (5.0/12.0 + x/24.0)*x));
        }else if(-1.5 <= x && x < 1.5){
            return 115.0/192.0 + x*x*(-(5.0/8.0) + x*x/4.0);
        }else{
            return 0;
        }
    };

    BSpline.prototype.basisDeg5 = function(x){
        if(-2 <= x && x < -1){
            return 17.0/40.0 + x*(-(5.0/8.0) + x*(-(7.0/4.0) + x*(-(5.0/4.0) + (-(3.0/8.0) - x/24.0)*x)));
        }else if(0 <= x && x < 1){
            return 11.0/20.0 + x*x*(-(1.0/2.0) + (1.0/4.0 - x/12.0)*x*x);
        }else if(2 <= x && x <= 3){
            return 81.0/40.0 + x*(-(27.0/8.0) + x*(9.0/4.0 + x*(-(3.0/4.0) + (1.0/8.0 - x/120.0)*x)));
        }else if(-3 <= x && x < -2){
            return 81.0/40.0 + x*(27.0/8.0 + x*(9.0/4.0 + x*(3.0/4.0 + (1.0/8.0 + x/120.0)*x)));
        }else if(1 <= x && x < 2){
            return 17.0/40.0 + x*(5.0/8.0 + x*(-(7.0/4.0) + x*(5.0/4.0 + (-(3.0/8.0) + x/24.0)*x)));
        }else if(-1 <= x && x < 0){
            return 11.0/20.0 + x*x*(-(1.0/2.0) + (1.0/4.0 + x/12.0)*x*x);
        }else{
            return 0;
        }
    };

    BSpline.prototype.getInterpol = function(seq,t){
        var f = this.baseFunc;
        var rangeInt = this.baseFuncRangeInt;
        var tInt = Math.floor(t);
        var result = 0;
        for(var i = tInt - rangeInt;i <= tInt + rangeInt;i++){
            result += seq(i)*f(t-i);
        }
        return result;
    };


    BSpline.prototype.calcAt = function(t){
        t = t*((this.degree+1)*2+this.points.length);//t must be in [0,1]
        var x = this.getInterpol(this.seqAt('x'),t).toFixed(4),
            y = this.getInterpol(this.seqAt('y'),t).toFixed(4)

        // 数组形式访问较快
        // https://github.com/tonny-zhang/docs/issues/1#user-content-1
        return IS_POINTS_ARRAY? [x, y]: {x: x, y: y};
    };
    // degree = [2, 5]; factor = [2, 10]
    return function(points, degree, factor){
      degree = degree || 4;
      var len = points.length;
      var num = len * (factor || 5);
      num < MIN_POINT_NUM && (num = Math.max(num*5, MIN_POINT_NUM));
      // console.log('factor = '+factor+', len = '+len +', num = '+num+', degree = '+degree);
      var spline = new BSpline(points, degree, true);
      var points_return = [];
      var space = 1/num;
      for(var t = 0; t <= 1; t += space){
        var interpol = spline.calcAt(t);
        points_return.push(interpol);
      }
      return points_return;
    }
  })();

  var MIN_DIS = Math.pow(0.2, 2);
  var PI = Math.PI;
  var dealItems = (function(){
    return function(items){
      var len = items.length;
      var is_small = len < MIN_POINT_NUM;
      var startPoint = items[0];
      var items_new = [startPoint];
      for(var i = 1, j = len-1; i<j; i++){
        var item = items[i];
        if(is_small || Math.pow(startPoint.x - item.x, 2) + Math.pow(startPoint.y - item.y, 2) > MIN_DIS){
          items_new.push(item);
          startPoint = item;
        }
      }
      items_new.push(items[len-1]);
      // !!可对点少的多边形，进行变形处理

      // 找到三个点间角度最小的点做项
      var max_index = 0;
      var max_angle = 0;
      for (var i = 1, j = items_new.length-1; i<j; i++) {
        var p = items_new[i],
            p_prev = items_new[i == 0? j-1: i - 1],
            p_next = items_new[i+1 == j? 0: i+1];
        var x_p = p.x,
            x_prev = p_prev.x,
            x_next = p_next.x,
            y_p = p.y,
            y_prev = p_prev.y,
            y_next = p_next.y;
        if (x_p == x_prev && x_p == x_next || (y_p == y_prev && y_p == y_next)) {
            max_index = i;
            // max_angle = Math.PI;
            break;
        } else {
            // 向量运算，得到向量夹角
            var vector_a_x = x_p - x_prev,
                vector_a_y = y_p - y_prev,
                vector_b_x = x_next - x_p,
                vector_b_y = y_next - y_p;
            var cos_angle = (vector_a_x * vector_b_x + vector_a_y * vector_b_y)/
            (Math.sqrt(vector_a_x*vector_a_x + vector_a_y*vector_a_y) + Math.sqrt(vector_b_x*vector_b_x + vector_b_y*vector_b_y))

            var angle = PI - Math.acos(cos_angle);
            if (max_angle < angle) {
                max_angle = angle;
                max_index = i;
            }
        }
      }
      if (max_index > 0) {
          items_new = items_new.slice(max_index).concat(items_new.slice(0, max_index));
      }
    //   console.log('j='+j, max_index, max_angle/ Math.PI*180, arr);
      return smoothBSpline(items_new, 4);
    }
  })();

  var _model;
  var util = require('./util');
  var util_color = util.color;
  var util_log = function(msg) {
      _model && _model.emit('log', msg);
  }
  var utils_polygon = util.Polygon;
  var isPointIn = utils_polygon.isPointIn,
    isPolygonIn = utils_polygon.isPolygonIn;

  var SHOW_CONSOLE = false;
  var DEFAULT_VALUE = 999999;
  var COLOR_TRANSPANT = require('./const').COLOR.TRANSPANT;
  var IS_POINTS_ARRAY = false;
  /*
   * 解决的问题如下：
   * 1. 找到离默认值最近且个数最多的颜色或等级
   * 2. 确定图例区间和表达的意思是不是相反（值越大面越小）
   * 3. 用Conrec类对数据进行等值线的初始化
   * 4. 用格点数据对面进行判断是否是孤岛并进行颜色初始化
   * 5. 找到孤岛面的父级面，建立索引包含关系
   * 6. 生成返回数据
  */
  function conrec(rasterData, blendent, is_points_array/*返回的点是否为数组*/, cb){
    IS_POINTS_ARRAY = is_points_array;
    var t_start = new Date();
    var space = rasterData[1][0].x - rasterData[0][0].x;
    if (space < 0.5) {
        MIN_DIS = Math.pow(Math.max(0.1, space*2), 2)
    }
    SHOW_CONSOLE && console.time('conrec');
    var color_method = util_color(blendent);
    if (!color_method) {
        return cb(new Error('conrec use blendent error!'));
    }
    var _interpolate_width,
		_interpolate_height;
	try{
		_interpolate_width = rasterData.length;
		_interpolate_height = rasterData[0].length;
	}catch(e){
        return cb(new Error('conrec data error!'));
    }
    var _new_interpolate_data = [];
	for(var i = 0; i < _interpolate_width; i++){
        var arr = [];
        for(var j = 0; j< _interpolate_height; j++){
            var v = rasterData[i][j];
            var color_info = color_method(v.v, null, true);
            var color = color_info[0],
            	color_level = color_info[1];
            arr.push({
            	x: v.x,
            	y: v.y,
            	v: v.v,
            	level: color_level,
            	c: color || COLOR_TRANSPANT
            });
        }
        _new_interpolate_data.push(arr);
    }
    rasterData = _new_interpolate_data;
    SHOW_CONSOLE && console.time('conrec.beforeConrec');
    var zArr = [];
    /*
    * 1. 设k为点所在区间的索引值
    * 2. 用 2*k 做为点所代表的值
    * 3. 用 2*k+1 做分割线
    */
    var colors = blendent[0].colors;
    colors.map(function(v, i){
      zArr.push(i*2+1);
    });
    var xArr = [], yArr = [];
    rasterData.map(function(v){
      xArr.push(v[0].x);
    });
    rasterData[0].map(function(v){
      yArr.push(v.y);
    });
    sortEsc(xArr);
    sortEsc(yArr);
    // sortEsc(zArr);

    var data_new = [];
    var len = rasterData.length;
    /*确定默认值的替代值*/
    // var level_cache = {},
    var level_around_cache = {};
    function initDefaultLevel(x, y){
      for(var i = x-1,j = x+1; i<j; i++){
        for(var i_y = y-1,j_y = y+1; i_y<j_y; i_y++){
          var val = null;
          try{
            val = rasterData[i][i_y];
          }catch(e){}
          if(val !== null && val.v === DEFAULT_VALUE){
            var level = rasterData[x][y].level;
            if(level_around_cache[level]){
              level_around_cache[level]++;
            }else{
              level_around_cache[level] = 1;
            }
            return true;
          }
          // if(val !== null && val.v !== DEFAULT_VALUE){
          //   var level = val.level;
          //   if(level_around_cache[level]){
          //     level_around_cache[level]++;
          //   }else{
          //     level_around_cache[level] = 1;
          //   }
          // }
        }
      }
    }
    for(var i = 0; i<len; i++){
      var items = rasterData[i];
      for(var i_1 = 0, j_1 = items.length; i_1<j_1; i_1++){
          if(!(i == 0 || i == len-1 || i_1 == 0 || i_1 == j_1 - 1)){
            var item = items[i_1];
            var v_current = item.v;
            if(v_current !== DEFAULT_VALUE){
              initDefaultLevel(i, i_1);
            }
            // else{
            //   var level = item.level;
            //   if(level_cache[level]){
            //     level_cache[level]++;
            //   }else{
            //     level_cache[level] = 1;
            //   }
            // }
          }
      }
    }
    var max_level = 0, max_num = 0;
    for(var i in level_around_cache){
      var n = level_around_cache[i];
      if(n > max_num){
        max_num = n;
        max_level = i;
      }
    }
    var is_reverse = false,
      checked = false;
    max_level *= 2;
    for(var i = 0, j = zArr.length; i<j; i++){
      var v = zArr[i];
      if(!checked && max_level <= v){
        checked = true;
        if(i >= j/2){
          is_reverse = true;
        }
      }
    }
    // is_reverse = false;
    // 初始化要进行Conrec操作的点数据
    var getVal = (function(){
      var zArr_cache = {};
      for(var i = 0, j = zArr.length; i<j; i++){
        zArr_cache[zArr[i] - 1] = zArr[j - i - 1] - 1;
      }
      return function(val){
        return is_reverse? zArr_cache[val]: val;
      }
    })();
    var cache_default_val = [];
    // console.log('is_reverse = '+is_reverse, zArr, max_level, level_around_cache);
    for(var i = 0; i<len; i++){
      var items = rasterData[i];
      var arr = [];
      for(var i_1 = 0, j_1 = items.length; i_1<j_1; i_1++){
        var val;
        if(i == 0 || i == len-1 || i_1 == 0 || i_1 == j_1 - 1){
          val = -DEFAULT_VALUE;
        }else{
          var _item = items[i_1];
          var v_current = _item.v;
          if(v_current == DEFAULT_VALUE){
            val = 0;
            cache_default_val.push({
              x: _item.x,
              y: _item.y
            });
          }else{
            val = getVal(items[i_1].level * 2);
          }
        }
        items[i_1].val_new = val;
        arr.push(val);
      }
      data_new.push(arr);
    }


    var x_start = rasterData[0][0].x, x_step = rasterData[1][0].x - rasterData[0][0].x,
      y_start = rasterData[0][0].y, y_step = rasterData[0][1].y - rasterData[0][0].y;
    //根据cornec 后的面上线上的点得到周围四个点在面里的颜色
    var NUM_CHECK = 51;
    function _getColorInner(items){
      var len = items.length;
      var space_num = Math.floor(len/NUM_CHECK);
      var points_check;
      if(space_num == 0){
        points_check = items.slice(0);
      }else{
        points_check = [];
        for(var i = 0, j = Math.ceil(len/space_num); i<j; i++){
          var v = items[i*space_num];
          if(v){
            points_check.push(v);
          }
        }
      }
      var color_arr = [];
      var point;
      while((point = points_check.shift())){
        var x = point.x,
          y = point.y;

        var x_per = (x - x_start) / x_step,
          y_per = (y - y_start) / y_step;
        var is_in = false;
        if(x_per % 1 == 0 && y_per % 1 == 0){
          is_in = true;
          try{
            color_arr.push(rasterData[x_per][y_per].c);
          }catch(e){
          }
        }
        var x_min = Math.floor(x_per),
          x_max = Math.ceil(x_per),
          y_min = Math.floor(y_per),
          y_max = Math.ceil(y_per);
        var p = [];
        try{
          p.push([rasterData[x_min][y_min], x_min, y_min]);
        }catch(e){};
        try{
          p.push([rasterData[x_max][y_min], x_max, y_min]);
        }catch(e){};
        try{
          p.push([rasterData[x_min][y_max], x_min, y_max]);
        }catch(e){};
        try{
          p.push([rasterData[x_max][y_max], x_max, y_max]);
        }catch(e){};

        for(var i = 0, j = p.length; i<j; i++){
          var val = p[i];
          if(isPointIn(items, val[0].x, val[0].y)){
            color_arr.push(rasterData[val[1]][val[2]].c);
            break;
          }
        }
      }
      var cache_color =  {};
      for(var i = 0, j = color_arr.length; i<j; i++){
        var val = color_arr[i];
        if(cache_color[val]){
          cache_color[val]++;
        }else{
          cache_color[val] = 1;
        }
      }
      var color_result = [];
      for(var i in cache_color){
        color_result.push({
          c: i,
          n: cache_color[i]
        });
      }
      color_result.sort(function(a, b){
        return b.n - a.n;
      });
      return color_result;
    }
    SHOW_CONSOLE && console.timeEnd('conrec.beforeConrec');
    SHOW_CONSOLE && console.time('conrec.Conrec');
    var c = new Conrec();
    c.contour(data_new, 0, xArr.length-1, 0, yArr.length-1, xArr, yArr, zArr.length, zArr);
    var list = c.contourList();
    SHOW_CONSOLE && console.timeEnd('conrec.Conrec');
    SHOW_CONSOLE && console.time('conrec.afterConrec_new');
    var list_new = [];
    if(is_reverse){
      colors = colors.slice(0);
      colors.reverse();
    }
    list.map(function(v){
        var _area = getArea(v);
        v._area = _area;
        v.area = Math.abs(_area);
        list_new.push(v);
        // var color_conf =  colors[Number(v.k)+1];
        // if(color_conf && color_conf.is_checked){
        //   v.c_m = color_conf.color;
        //   list_new.push(v);
        // }
    });
    // 从大到小排列
    list_new.sort(function(a, b){
      return b.area - a.area;
    });
    // 得到多边形的盒子边界
    function _getBound(items){
      var item = items[0],
        x_min = x_max = item.x,
        y_min = y_max = item.y;
      for(var i = 1, j = items.length; i<j; i++){
        var val = items[i];
        var x = val.x, y = val.y;
        if(x_min > x){
          x_min = x;
        }
        if(x_max < x){
          x_max = x;
        }
        if(y_min > y){
          y_min = y;
        }
        if(y_max < y){
          y_max = y;
        }
      }
      return [x_min, y_min, x_max, y_max];
    }
    // 随机得到几个点
    function _getItemsRandom(items, num){
      var arr = [];
      var len = items.length;
      for(var i = 0; i<num; i++){
        arr.push(items[~~(Math.random() * len)]);
      }
      return arr;
    }
    // 找到各个面的父级
    SHOW_CONSOLE && console.time('conrec.afterConrec_new.findparent');
    for(var i = list_new.length-1; i>0; i--){
      var items = list_new[i],
        len_items = items.length;
      var items_check = _getItemsRandom(items, 10); //随机产生几个点，只要有一个不在就可以说明整个面不在要检测的面里
      for(var i_start = i - 1; i_start>=0; i_start--){
        var items_parent = list_new[i_start];
        var is_parent = true;
        for(var i_check = 0, j_check = items_check.length; i_check<j_check; i_check++){
          var val = items_check[i_check];
          if(!isPointIn(items_parent, val.x, val.y)){
            is_parent = false;
            break;
          }
        }
        if(is_parent){
          items.p_index = i_start;
          break;
        }
      }
      items.bound = _getBound(items);
    }
    SHOW_CONSOLE && console.timeEnd('conrec.afterConrec_new.findparent');
    // 对各个面进行孤岛判断
    SHOW_CONSOLE && console.time('conrec.afterConrec_new.island');
    var cache_index = {};
    var temp;
    while((temp = cache_default_val.shift())){
      for(var i = list_new.length-1; i>0; i--){
        var item = list_new[i],
          bound = item.bound;
        var x = temp.x, y = temp.y;
        if(x >= bound[0] && x <= bound[2] && y >= bound[1] && y <= bound[3] && isPointIn(item, x, y)){
          (cache_index[i] || (cache_index[i] = [])).push(temp);// cache_index[i]有值的话即可判断为孤岛
          break;
        }
      }
    }
    SHOW_CONSOLE && console.timeEnd('conrec.afterConrec_new.island');
    // 对各个面进行填色
    SHOW_CONSOLE && console.time('conrec.afterConrec_new.getcolor');
    for(var i = list_new.length-1; i>=0; i--){
      if(!cache_index[i]){
        var c = _getColorInner(list_new[i]);
        try{
          list_new[i].c = c[0].c;
        }catch(e){
        }
      }
    }
    SHOW_CONSOLE && console.timeEnd('conrec.afterConrec_new.getcolor');
    SHOW_CONSOLE && console.time('conrec.afterConrec_new.relation');
    var list_return = [],
      relation = [];

    var cache_relation = {};
    for(var i = list_new.length-1; i>0; i--){
      if(cache_index[i]){
        var p_index = list_new[i].p_index;
        (cache_relation[p_index] || (cache_relation[p_index] = [])).push(i);
      }
    }
    for(var i = 0, j = list_new.length; i<j; i++){
      var polygon = list_new[i];
      var color = polygon.c || polygon.c_m;
      var val = [i, color];
      var clip = cache_relation[i];
      if(clip){
        val.push(clip);
      }
      if(!cache_index[i]){
        relation.push(val);
      }
    //   console.log(polygon.area, polygon._area);
      list_return[i] = dealItems(polygon);
    }
    SHOW_CONSOLE && console.timeEnd('conrec.afterConrec_new.relation');
    var val_return = {
      list: list_return,
      r: relation
    };
    SHOW_CONSOLE && console.timeEnd('conrec.afterConrec_new');
    SHOW_CONSOLE && console.timeEnd('conrec');
    util_log('conrec takes '+(new Date() - t_start)+' ms!');
    cb(null, val_return);
  }
  conrec.setModel = function(model) {
      _model = model;
      return conrec;
  };

  module.exports = conrec;
}();
