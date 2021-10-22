const MediasControllers = angular.module("aq.medias.controllers", []);

MediasControllers.controller("MediasCtrl", ["$scope", "$route", '$modal', "MediaApiV2", "toastService", "ConfigV2", "$location", "$translate",
    function ($scope, $route, $modal, MediaApiV2, toastService, ConfigV2, $location, $translate) {
        $scope.link = "-";
        $scope.nbItemsPerPage = 20;
        $scope.maxSize = 5;
        $scope.totalMedias = 0;
        $scope.groups = [];
        $scope.local = {
            search: ""
        };

        $scope.addMedia = function () {
            var modalInstance = $modal.open({
                templateUrl: "app/medias/views/modals/media-new.html",
                controller: "MediasModalNewCtrl"
            });

            modalInstance.result.then(function (returnedValue) {
                if(returnedValue.create == true){
                    $scope.mediaDetails({_id: `${returnedValue._id}:new`})
                }
            });
        };

        $scope.generateFilter = function () {
            const filter = {};
            if($scope.currentTab === 'general') {
                filter.$or = [{group: null}, {group: ""}, {group: "general"}]
            } else {
                filter.group = $scope.currentTab
            }
            if ($scope.local.search !== "") {
                filter.name = {$regex: $scope.local.search, $options: 'gim'}
                delete filter.$or;
                delete filter.group;
            } else {
                delete filter.name
            }
            return filter;
        }


        $scope.init = function () {
            MediaApiV2.getGroups({}, function (groups) {
                $scope.groups = groups;
                $scope.currentTab = $scope.groups[0];

                MediaApiV2.list({PostBody: {filter: $scope.generateFilter(), structure: '*', limit: $scope.nbItemsPerPage, page: 1}}, function ({datas, count}) {
                    $scope.list = datas;
                    $scope.totalMedias = count;
                });
            });
        };

        $scope.init();

        $scope.onPageChange = function (page) {
            $scope.page = page;
            MediaApiV2.list({PostBody: {filter: $scope.generateFilter(), structure: '*', limit: $scope.nbItemsPerPage, page}}, function ({datas, count}) {
                $scope.list = datas;
                $scope.totalMedias = count;
            });
        }

        $scope.remove = function (media, event) {
            event.stopPropagation();
            if (confirm($translate.instant("confirm.deleteMedia"))) {
                MediaApiV2.delete({id: media._id}, function (response) {
                    toastService.toast("success", $translate.instant("medias.medias.deleteMedia"));
                    $route.reload();
                });
            }
        };

        $scope.copyLink = function (index, event) {
            event.stopPropagation();
            $modal.open({
                templateUrl: 'app/medias/views/modals/copy_link.html',
                controller: 'MediasModalCtrl',
                resolve: {
                    media: function () {
                        return $scope.list[index];
                    }
                }
            });
        };

        $scope.changeTab = function(group) {
            $scope.currentTab = group;
            $scope.onPageChange(1);
        }

        $scope.mediaDetails = (media) => {
            $location.path('/medias/' + media._id);
        }
        $scope.isPicture = function(media) {
            if(media.link.match(new RegExp("jpg|jpeg|png|gif|svg", 'i'))) {
                return true
            }
            return false
        }
    }]
);

MediasControllers.controller("MediasDetailsCtrl",
    ["$scope", "$location", "toastService", "ConfigV2", "MediaApiV2","$modal", "$routeParams", "$translate", "$q",
    function ($scope, $location, toastService, ConfigV2, MediaApiV2, $modal, $routeParams, $translate, $q) {
        $scope.media = {
            link : "",
            name : "",
            group: "",
        };

        $scope.nsUploadFiles = {
            isSelected : false
        };
        $scope.selectedDropdownItem = "";
        
        $scope.isEditMode = true;

        $scope.remove = function(){
            if (confirm($translate.instant("confirm.deleteMedia"))) {
                MediaApiV2.delete({id: $scope.media._id}, function (response) {
                    toastService.toast("success", $translate.instant("medias.medias.deleteMedia"));
                    $location.path('/medias');
                });
            }
        }

        function setMode(mode){
            let id;
            if(mode == true){
                // it is a new media
                id = $routeParams.id.substring(0, $routeParams.id.length - 4);
                $scope.additionnalButtons = [
                    {
                        text: 'medias.medias.uploadButton',
                        onClick: function(){
                            $scope.addMulti();
                        }
                    }
                ];
            }else{
                id = $routeParams.id;
            }
            $scope.id = id;
            // $scope.id is used in the nsUpload, with this parameter, we upload the pictures to the correct media already created
            MediaApiV2.query({PostBody: {filter: {_id: $scope.id}, limit: 0}}, function (response) {
                $scope.media = response;
            });
            MediaApiV2.getGroups({query: ''}, function (groups) {
                $scope.groups = groups.filter(gp => typeof gp === 'string');
                if($scope.media.group){
                    // to bind the input "group"
                    $scope.selectedDropdownItem = $scope.media.group;
                    $scope.filterDropdown($scope.selectedDropdownItem)
                } else {
                    $scope.selectedDropdownItem = null
                }
            }, function (error){
                console.log(error);
            });
        }

        $scope.copyLink = function (media) {
            $modal.open({
                templateUrl: 'app/medias/views/modals/copy_link.html',
                controller: 'MediasModalCtrl',
                resolve: {
                    media: function () {
                        return media;
                    }
                }
            });
        };

        $scope.success = function () {
            toastService.toast("success", $translate.instant("medias.medias.copiedLink"));
        };

        $scope.onErrorUploadMedia = function () {
            toastService.toast("danger", $translate.instant("global.error"));
        }

        $scope.save = function () {
            if ($scope.nsUploadFiles.isSelected){
                let response = confirm($translate.instant("confirm.fileAttachedNotSaved"));
                if (!response){
                    return
                }
            }
            MediaApiV2.save({media: $scope.media}, function (response) {
                toastService.toast("success", $translate.instant("medias.medias.mediaSaved"));
                if($routeParams.id.substring($routeParams.id.length - 4, $routeParams.id.length) == ":new"){
                    $location.path("/medias/"+response._id);
                }
            }, function (error) {
                if(error.data){
                    if(error.data.message && error.data.message != ""){
                        toastService.toast("danger",  error.data.message);
                    }
                }else if(error && error.code != ""){
                    toastService.toast("danger", error.code);
                }else{
                    console.log(error);
                    toastService.toast("danger", $translate.instant("global.standardError"));
                }
            });
        };


        $scope.filterDropdown = function (userInput) {
            var filter = $q.defer();
            var normalisedInput = userInput.toLowerCase();
            $scope.media.group = userInput

            var filteredArray = $scope.groups.filter(function(group) {
                return group.toLowerCase().indexOf(normalisedInput) === 0;
            });

            filter.resolve(filteredArray);
            return filter.promise;
        };
        
        $scope.itemObjectSelected = function (item) {
            $scope.selectedDropdownItem = item;
        };

        $scope.isPicture = function(media) {
            if(media.link.match(new RegExp("jpg|jpeg|png|gif|svg", "i"))) {
                return true
            }
            return false
        }

        $scope.addMulti = function (nodeParent) {
            var modalInstance = $modal.open({
                templateUrl: "app/medias/views/modals/medias-mass-new.html",
                controller: "MediasModalMassNewCtrl"
            });

            modalInstance.result.then(function (resultOfTheModal) {
                // do nothing
            });
        };
        setMode($routeParams.id.substring($routeParams.id.length - 4, $routeParams.id.length) == ":new");
    }
]);

MediasControllers.controller("MediasModalCtrl", ["$scope", "toastService", "$modalInstance", "media", "$translate",
    function ($scope, toastService, $modalInstance, media, $translate) {
        $scope.media = media;
        $scope.positions = [
            {
                pos: "center",
                id: "center"
            },
            {
                pos: "top",
                id: "top"
            },
            {
                pos: "bottom",
                id: "bottom"
            },
            {
                pos: "left",
                id: "left"
            },
            {
                pos: "right",
                id: "right"
            },
            {
                pos: "top-left",
                id: "topLeft"
            },
            {
                pos: "top-right",
                id: "topRight"
            },
            {
                pos: "bottom-left",
                id: "bottomLeft"
            },
            {
                pos: "bottom-right",
                id: "bottomRight"
            }
        ];

        $scope.getTranslation = function(pos){
            return `medias.modal.${pos}`;
        }
        $scope.info = {
            crop:false,
            position:"center",
            background:false,
            largeur: "",
            longueur: "",
            quality: "",
            r:255,
            g:255,
            b:255,
            alpha:1
        };
        if (media.name) {
            $scope.info.name = media.name;
        }

        $scope.generer = function () {
            const size = $scope.info.largeur + "x" + $scope.info.longueur;
            const quality = $scope.info.quality;
            let filename = "";
            if ($scope.info.name !== undefined) {
                filename = $scope.info.name.replace(/[^\w\s]/gi, '').replace(/\s/g, '')
                    + "." + $scope.media.link.replace(`medias/`, "")
                        .substr($scope.media.link.replace(`medias/`, "").lastIndexOf('.') + 1);
            } else {
                filename = $scope.media.link.replace(`medias/`, "");
            }

            let background  = '';
            let crop        = '';
            if (
                (!$scope.info.largeur || !$scope.info.longueur || !quality)
                || (
                    $scope.info.background
                    && (
                        !$scope.info.r || !$scope.info.g || !$scope.info.b ||
                        !($scope.info.alpha >= 0 && $scope.info.alpha <= 1))
                )
            ) {
                toastService.toast("warning", $translate.instant("medias.modal.enterAllValue"));
            } else {
                if ($scope.info.background) {
                    if ($scope.info.alpha) {
                        if ($scope.info.alpha > 1) {
                            $scope.info.alpha = 1;
                        }
                    }
                    background = `-${$scope.info.r},${$scope.info.g},${$scope.info.b},${$scope.info.alpha}`;
                }
                if ($scope.info.crop) {
                    crop = `-crop-${$scope.info.position}`;
                }
                toastService.toast("success", $translate.instant("medias.modal.linkGenerated"));
                $scope.link = `${window.location.origin}/images/medias/${size}-${quality}${crop}${background}/${$scope.media._id}/${filename}`;
                const elem = document.getElementById("copy-link");
                elem.focus();
                elem.select();
            }
        };

        $scope.copierLien = function() {
            const elem = document.getElementById("copy-link");
            elem.focus();
            elem.select();
            if (document.execCommand('copy')) {
                toastService.toast("success", $translate.instant("medias.modal.copiedLink"));
            }
        }

        $scope.cancel = function () {
            $modalInstance.close()
        };
    }
]);


MediasControllers.controller("MediasModalMassNewCtrl", ["$scope", "toastService", "$modalInstance", "$translate",
    function ($scope, toastService, $modalInstance, $translate) {
        $scope.local = {
            insertDBMediaUpload: true
        };
        $scope.beforeMediaMass = function () {
            toastService.toast("info", $translate.instant("medias.modal.takeTime"));
        };

        $scope.uploadedMediaMass = function () {
            toastService.toast("success", $translate.instant("medias.modal.massAddDone"));
            $modalInstance.close('ok')
        };

        $scope.cancel = function () {
            $modalInstance.close('cancel')
        };
    }
]);

MediasControllers.controller("MediasModalNewCtrl", [
    "$scope", "$modalInstance", "MediaApiV2", "toastService",
    function ($scope, $modalInstance, MediaApiV2, toastService) {
        $scope.media = {
            link : "",
            name : "",
            group: "",
        };

        $scope.save = function (category) {
            MediaApiV2.save({media: $scope.media}, function (rep) {
                $modalInstance.close({create: true, _id: rep._id});
            }, function(err) {
                if(err.data.code === "Conflict"){
                    toastService.toast("danger", err.data.message + " : code already exists");
                }else{
                    toastService.toast("danger", err.data.message);
                }
            });
        };

        $scope.cancel = function () {
            $modalInstance.close({create: false});
        };
    }
]);
